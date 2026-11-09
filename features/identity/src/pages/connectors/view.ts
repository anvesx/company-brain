import { esc, hidden } from "../layout.js";
import { logo } from "./logos.js";
import { GRID_STYLE } from "./style.js";

export interface Tile {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  /** Who runs the source ("Google"), shown as `by ...`. Defaults to the name. */
  by?: string;
  /** Where the app shows what the stored token can read. Linked tiles link there when set. */
  dataPath?: string;
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

/** The right-hand control: a green check when linked, a plus form when it can be, "not configured" when neither. */
const control = (t: Tile, linked: boolean, csrf: string): string => {
  if (linked) return '<span class="ok" role="img" aria-label="Connected">&#10003;</span>';
  if (!t.configured) return "<em>not configured</em>";
  const post = `/connections/link/${esc(t.id)}`;
  return `<form method="post" action="${post}">${hidden({ csrf })}<button class="plus" type="submit" aria-label="Connect ${esc(t.name)}">+</button></form>`;
};

/** One tile: logo, name, one line, `by <provider>`, then the control. A provider that is not set up is greyed out with no form. */
const tileItem = (t: Tile, linked: boolean, csrf: string): string =>
  `<li data-provider="${esc(t.id)}" class="tile"${t.configured ? "" : ' aria-disabled="true"'}><span class="logo">${logo(t.id, t.name)}</span><div class="text"><strong>${esc(t.name)}</strong><p>${esc(t.description)}</p><p class="by">by ${esc(t.by ?? t.name)}${linked && t.dataPath ? ` · <a href="${esc(t.dataPath)}">View data</a>` : ""}</p></div>${control(t, linked, csrf)}</li>`;

/** One linked account: who, since when, how it stands. A stale one offers a new sign-in on the same account. */
const accountItem = (a: LinkedAccount, name: string, csrf: string): string =>
  `<li data-account="${esc(a.id)}"><strong>${esc(name)}</strong> ${esc(a.label ?? "")} <time datetime="${new Date(a.createdAt).toISOString()}">${new Date(a.createdAt).toISOString().slice(0, 10)}</time> ${esc(a.status)}
${a.status === "needs-auth" ? button(`/connections/link/${esc(a.providerId)}`, csrf, "Sign in again") : ""}${button(`/connections/unlink/${esc(a.id)}`, csrf, "Disconnect")}</li>`;

/** The connector grid, then the accounts this person has linked (only theirs). Empty when no connector is set up. */
export const connectorsView = (tiles: Tile[], accounts: LinkedAccount[], csrf: string): string => {
  if (!tiles.length) return "";
  const named = (id: string) => tiles.find((t) => t.id === id)?.name ?? id;
  const isLinked = (t: Tile) => accounts.some((a) => a.providerId === t.id && a.status === "active");
  const linked = accounts.length ? `<h3>Linked accounts</h3><ul>${accounts.map((a) => accountItem(a, named(a.providerId), csrf)).join("")}</ul>` : "";
  return `<section aria-label="Connectors"><h2>Connectors</h2>${GRID_STYLE}<ul class="tiles">${tiles.map((t) => tileItem(t, isLinked(t), csrf)).join("")}</ul>${linked}</section>`;
};
