import type { Connector } from "@brain/connector-kit";
import type { GraphNode } from "@brain/graph-store";
import { describe, expect, it } from "vitest";
import { sourceRecheck } from "../../src/live/source-recheck.js";

const doc = (source: string): GraphNode =>
  ({ tenant: "t", id: "d", kind: "document", source, address: "a.md", title: "a", version: "1", props: {}, validFrom: 1 }) as GraphNode;
const caller = { user: "ann", tenant: "t" };
const connector = (id: string, canRead?: Connector["canRead"]): Connector =>
  ({ id, list: async () => ({ items: [] }), fetch: async () => ({ text: "", version: "" }), ...(canRead ? { canRead } : {}) }) as Connector;

describe("source-backed recheck", () => {
  it("asks the document's own connector with the asker's own token", async () => {
    const seen: string[] = [];
    const check = sourceRecheck({
      connectors: { gh: connector("gh", async (a, { token }) => (seen.push(`${a}:${token}`), true)) },
      tokenFor: (c, source) => `${c.user}@${source}`,
    });
    expect(await check(doc("gh"), caller)).toBe(true);
    expect(seen).toEqual(["a.md:ann@gh"]);
  });

  it("returns what the source says, including false", async () => {
    const check = sourceRecheck({ connectors: { gh: connector("gh", async () => false) }, tokenFor: () => "t" });
    expect(await check(doc("gh"), caller)).toBe(false);
  });

  it("denies when there is no token, no connector, or no canRead", async () => {
    const some = connector("gh", async () => true);
    expect(await sourceRecheck({ connectors: { gh: some }, tokenFor: () => undefined })(doc("gh"), caller)).toBe(false);
    expect(await sourceRecheck({ connectors: {}, tokenFor: () => "t" })(doc("gh"), caller)).toBe(false);
    expect(await sourceRecheck({ connectors: { gh: connector("gh") }, tokenFor: () => "t" })(doc("gh"), caller)).toBe(false);
  });
});
