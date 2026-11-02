import type { Connector, ListedDoc } from "@anvesx/connector-kit";

/** A listed document with a fixed ACL; `over` replaces any field. */
export const doc = (address: string, users: string[] = [], over: Partial<ListedDoc> = {}, groups: string[] = []): ListedDoc => ({
  address,
  title: address,
  version: "1",
  zone: "company",
  updatedAt: "2026-01-01T00:00:00.000Z",
  acl: { allowUsers: users, allowGroups: groups, version: 1 },
  ...over,
});

/** A connector `id` that lists exactly `items`, in one page. */
export const listing = (id: string, items: () => ListedDoc[], extra: Partial<Connector> = {}): Connector => ({
  id,
  list: async () => ({ items: items() }),
  fetch: async () => ({ text: "", version: "1" }),
  ...extra,
});

/** A connector whose listing is held until `open()`, then returns `items`: a run that is slow to list. */
export const gated = (id: string, items: ListedDoc[]) => {
  let open!: () => void;
  const gate = new Promise<void>((r) => {
    open = r;
  });
  const connector = listing(id, () => items, {
    list: async () => {
      await gate;
      return { items };
    },
  });
  return { connector, open };
};
