import type { Manifest } from "@anvesx/connectors";
import type { Deps } from "../../deps.js";
import { providerFor } from "../../oauth/providers.js";

export type Entry = { id: string; name: string; reason?: string; scopes: string[]; origin: string };
export type Group = { title: string; entries: Entry[] };

const entry = (m: Manifest, origin: string, reason?: string): Entry => ({
  id: m.id,
  name: m.name,
  scopes: m.auth.kind === "oauth2" ? m.auth.scopes : [],
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

/** The caller's tenant catalog in two groups: what can be connected now, and what cannot with the reason. */
export function directory(d: Deps, tenant: string): Group[] {
  const all = d.catalog.list(tenant).map((l) => entry(l.manifest, originOf(d, l.manifest), whyNot(d, l.manifest)));
  return [
    { title: "Connect with the provider's own sign-in", entries: all.filter((e) => !e.reason) },
    { title: "Not available", entries: all.filter((e) => e.reason) },
  ].filter((g) => g.entries.length > 0);
}

/** One entry for the add page, by manifest id. */
export const entryFor = (d: Deps, id: string, tenant: string): Entry | undefined =>
  directory(d, tenant)
    .flatMap((g) => g.entries)
    .find((e) => e.id === id);
