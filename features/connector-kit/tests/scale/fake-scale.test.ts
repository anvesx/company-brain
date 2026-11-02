import { performance } from "node:perf_hooks";
import { expect, it } from "vitest";
import { createFakeConnector, type FakeDoc } from "../support/fake.js";

it("pages 50k fake docs under 2 seconds", async () => {
  const docs: FakeDoc[] = Array.from({ length: 50_000 }, (_, index) => ({
    address: `doc-${index}`,
    title: `Doc ${index}`,
    text: `Text ${index}`,
    version: "1",
    acl: { allowUsers: [], allowGroups: [], version: 0 },
    zone: "company",
    updatedAt: "2026-11-01T00:00:00.000Z",
  }));
  const connector = createFakeConnector("scale", docs);
  const start = performance.now();
  let count = 0;
  let cursor: string | undefined;
  do {
    const page = await connector.list(cursor === undefined ? { limit: 1000 } : { limit: 1000, cursor });
    count += page.items.length;
    cursor = page.nextCursor;
  } while (cursor !== undefined);
  expect(count).toBe(50_000);
  expect(performance.now() - start).toBeLessThan(2_000);
});
