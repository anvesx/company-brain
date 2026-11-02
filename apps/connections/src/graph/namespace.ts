import type { Connector } from "@anvesx/connector-kit";

/** The graph id of a document: its source (`<provider>:<account id>`) in front of the address, so two accounts never share a node. */
export const docId = (source: string, address: string): string => `${source}/${address}`;

/** Group ids are per account as well: a team called `eng` in two accounts is two groups. People keep their own id. */
export const resolveFor =
  (source: string) =>
  (kind: "person" | "team", raw: string): string =>
    kind === "team" ? `${source}/${raw}` : raw;

/** Lists documents under their graph id. The store wrapper in `store.ts` keeps `address` as the source's own, which the brain's recheck needs. */
export const withNamespace = (c: Connector, source: string): Connector => ({
  ...c,
  list: async (q) => {
    const page = await c.list(q);
    return { ...page, items: page.items.map((d) => ({ ...d, address: docId(source, d.address) })) };
  },
});
