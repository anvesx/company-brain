import type { Manifest } from "@anvesx/connectors";
import { categoryOf, readsOf } from "../../catalog/describe.js";
import type { Deps } from "../../deps.js";
import { providerFor } from "../../oauth/providers.js";

export type Entry = { id: string; name: string; reason?: string; reads: string[]; origin: string };
export type Group = { title: string; entries: Entry[] };

const entry = (m: Manifest, origin: string, reason?: string): Entry => ({
  id: m.id,
  name: m.name,
  reads: readsOf(m),
  origin,
  ...(reason && { reason }),
});

/** Why a provider cannot be connected from the browser, or undefined when it can. */
export function whyNot(d: Deps, m: Manifest): string | undefined {
  if (m.auth.kind !== "oauth2") return "It signs in with a pasted credential, and this page never takes one.";
  return providerFor(d.oauth, m) ? undefined : "No OAuth client is set up for it on this server.";
}

/** Where the browser lands to sign in, as this server is configured. */
const originOf = (d: Deps, m: Manifest): string => {
  const p = providerFor(d.oauth, m);
  return p ? new URL(p.authorizeURL).origin : "";
};

/** The caller's tenant catalog grouped by category (as `GET /v1/catalog` names it), each entry either connectable or with the reason it is not. */
export function directory(d: Deps, tenant: string): Group[] {
  const groups = new Map<string, Entry[]>();
  for (const l of d.catalog.list(tenant)) {
    const title = categoryOf(l.manifest, l.tenant !== undefined);
    groups.set(title, [...(groups.get(title) ?? []), entry(l.manifest, originOf(d, l.manifest), whyNot(d, l.manifest))]);
  }
  return [...groups].map(([title, entries]) => ({ title, entries })).sort((a, b) => a.title.localeCompare(b.title));
}

/** One entry for the add page, by manifest id. */
export const entryFor = (d: Deps, id: string, tenant: string): Entry | undefined =>
  directory(d, tenant)
    .flatMap((g) => g.entries)
    .find((e) => e.id === id);
