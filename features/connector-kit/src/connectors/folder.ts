import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import { ConnectorError, type Connector, type ListedDoc } from "../core/contract.js";
import { pageItems } from "../core/paging.js";
import { readAcl } from "./folder-acl.js";
import { escapes, safeRealpath } from "./folder-path.js";

const scan = async (root: string): Promise<ListedDoc[]> => {
  const docs: ListedDoc[] = [];
  const visited = new Set<string>();
  const visit = async (path: string): Promise<void> => {
    if (visited.has(path)) return;
    visited.add(path);
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.name.endsWith(".acl.json")) continue;
      const shown = join(path, entry.name);
      const resolved = await safeRealpath(root, shown);
      const info = await lstat(resolved);
      if (info.isDirectory()) await visit(resolved);
      else if (info.isFile()) {
        const address = relative(root, shown).split(sep).join("/");
        docs.push({ address, title: basename(shown), version: `${info.mtimeMs}:${info.size}`,
          acl: await readAcl(root, shown), zone: "personal", updatedAt: info.mtime.toISOString() });
      }
    }
  };
  await visit(root);
  return docs.sort((left, right) => left.address.localeCompare(right.address));
};

export const createFolderConnector = (id: string, rootDir: string): Connector => ({
  id,
  async list(query) {
    const root = await realpath(rootDir);
    return pageItems(await scan(root), query);
  },
  async fetch(address) {
    const root = await realpath(rootDir);
    const candidate = join(root, address);
    if (escapes(root, candidate)) throw new ConnectorError("PATH_ESCAPE", `Path leaves root: ${address}`);
    const resolved = await safeRealpath(root, candidate);
    const info = await stat(resolved);
    if (!info.isFile()) throw new ConnectorError("NOT_FOUND", `Document not found: ${address}`);
    return { text: await readFile(resolved, "utf8"), version: `${info.mtimeMs}:${info.size}` };
  },
});
