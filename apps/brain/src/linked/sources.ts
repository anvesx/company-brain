export interface Row {
  name: string;
  detail: string;
}
export interface Source {
  title: string;
  /** Real API origin; `<ID>_BASE_URL` replaces it. */
  origin: string;
  /** Path and query of the one call. */
  path: string;
  rows: (json: unknown) => Row[];
}

type Json = Record<string, unknown>;
const list = (json: unknown, key: string): Json[] => {
  const found = (json as Json | null)?.[key];
  return Array.isArray(found) ? (found as Json[]) : [];
};
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** The calls the brain makes with a person's token, by catalog id. Reads only: the scopes in `doors/catalog.ts` allow no more. */
export const SOURCES: Record<string, Source> = {
  github: {
    title: "Your repositories",
    origin: "https://api.github.com",
    path: "/user/repos?per_page=10&sort=updated",
    rows: (json) => (Array.isArray(json) ? (json as Json[]) : []).map((r) => ({ name: text(r.full_name), detail: text(r.description) })),
  },
  "google-drive": {
    title: "Your files",
    origin: "https://www.googleapis.com",
    path: "/drive/v3/files?pageSize=10&fields=files(id,name,mimeType)",
    rows: (json) => list(json, "files").map((f) => ({ name: text(f.name), detail: text(f.mimeType) })),
  },
  slack: {
    title: "Channels",
    origin: "https://slack.com",
    path: "/api/conversations.list?limit=10&types=public_channel",
    rows: (json) => list(json, "channels").map((c) => ({ name: `#${text(c.name)}`, detail: `${Number(c.num_members) || 0} members` })),
  },
};
