import { lstat, readdir } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import type { ListedDoc } from "../core/contract.js";
import { readAcl } from "./folder-acl.js";
import { safeRealpath } from "./folder-path.js";

export const scan = async (root: string): Promise<ListedDoc[]> => {
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
        docs.push({
          address,
          title: basename(shown),
          version: `${info.mtimeMs}:${info.size}`,
          acl: await readAcl(root, shown),
          zone: "personal",
          updatedAt: info.mtime.toISOString(),
        });
      }
    }
  };
  await visit(root);
  return docs.sort((left, right) => left.address.localeCompare(right.address));
};
