// Child process for the two-process write test: node writer.mjs <dist/index.js> <db> <prefix> <count>
import { pathToFileURL } from "node:url";

const [, , entry, path, prefix, count] = process.argv;
const { createGraphStore } = await import(pathToFileURL(entry).href);
const store = createGraphStore({ path });
const n = (id, title) => ({ tenant: "t1", id, kind: "document", source: "x", address: id, title, version: "1", props: {} });
for (let i = 0; i < Number(count); i++) {
  store.upsertNode(n(`${prefix}-${i}`, "own"), i);
  store.addEdge({ tenant: "t1", from: `${prefix}-${i}`, to: "shared", kind: "links-to", source: "x" }, i);
  store.addEdge({ tenant: "t1", from: "hub", to: `shared-${i}`, kind: "mentions", source: "x" }, i);
  store.upsertNode(n(`shared-${i}`, prefix), i + 1000);
}
store.close();
