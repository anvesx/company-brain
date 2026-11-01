import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { expect, it } from "vitest";
import { createFolderConnector } from "../../src/index.js";

const walk = async (connector: ReturnType<typeof createFolderConnector>, limit: number) => {
  let count = 0;
  let cursor: string | undefined;
  do {
    const page = await connector.list(cursor === undefined ? { limit } : { limit, cursor });
    count += page.items.length;
    cursor = page.nextCursor;
  } while (cursor !== undefined);
  return count;
};

it("pages 5k folder files in linear-ish time and handles deep nesting", async () => {
  const root = await mkdtemp(join(tmpdir(), "connector-kit-scale-"));
  for (let dir = 0; dir < 50; dir += 1) {
    await mkdir(join(root, `d${dir}`));
    await Promise.all(Array.from({ length: 100 }, (_, i) => writeFile(join(root, `d${dir}`, `f${i}.txt`), "x")));
  }
  let deep = root;
  for (let level = 0; level < 200; level += 1) { deep = join(deep, "n"); await mkdir(deep); }
  await writeFile(join(deep, "leaf.txt"), "x");
  const connector = createFolderConnector("scale", root);
  const start = performance.now();
  expect(await walk(connector, 1000)).toBe(5001);
  const coarse = performance.now() - start;
  const fineStart = performance.now();
  expect(await walk(connector, 100)).toBe(5001);
  const fine = performance.now() - fineStart;
  console.log(`folder scale: limit=1000 ${coarse.toFixed(0)}ms, limit=100 ${fine.toFixed(0)}ms`);
  expect(coarse).toBeLessThan(10_000);
  expect(fine).toBeLessThan(coarse * 3 + 500);
}, 60_000);
