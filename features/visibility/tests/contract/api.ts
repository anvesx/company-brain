/** The public surface WP-10 must export from `src/index.ts`: one decision, used by every route and every MCP tool. */
export type Viewer = { tenant: string; user: string; aliases: string[]; role: "member" | "admin"; zones: string[] };

/** One permission record as synced from the source. `allow` holds user ids, emails and group ids. `null` means unreadable. */
export type Acl = { at: number; allow: string[] | null };

/** A file and its permission history, oldest first. The last record is the current one. */
export type Target = { tenant: string; id: string; owner: string; zone: string; acl: Acl[] };

/** `readers` is present only for the owner and for admins (leak 4). */
export type Decision = { visible: false } | { visible: true; readers?: string[] };

export type Api = {
  /** `asOf` selects a past view of the data. It never selects past permissions (leak 1). */
  decide(viewer: Viewer, target: Target, opts?: { asOf?: number }): Decision;
};

const entry = new URL("../../src/index.ts", import.meta.url).href;
export const load = async (): Promise<Api> => (await import(/* @vite-ignore */ entry)) as Api;

export const ann: Viewer = { tenant: "one", user: "u-ann", aliases: ["ann@acme.test", "github:ann"], role: "admin", zones: ["general", "finance"] };
export const ben: Viewer = { tenant: "one", user: "u-ben", aliases: ["ben@acme.test"], role: "member", zones: ["general"] };
export const cy: Viewer = { tenant: "two", user: "u-cy", aliases: ["cy@globex.test"], role: "admin", zones: ["general", "finance"] };

/** A file in tenant one, owned by Ann, readable by the listed principals since time 1000. */
export const file = (allow: string[] | null, over: Partial<Target> = {}): Target => ({
  tenant: "one",
  id: "drive:budget",
  owner: "u-ann",
  zone: "general",
  acl: [{ at: 1_000, allow }],
  ...over,
});
