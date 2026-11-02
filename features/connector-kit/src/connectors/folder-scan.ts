import { lstat, readdir, readFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import type { ListedDoc } from "../core/contract.js";
import { aclVersion, readAcl } from "./folder-acl.js";
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
        const acl = await readAcl(root, shown);
        docs.push({
          address,
          title: basename(shown),
          version: aclVersion(info, acl, await readFile(resolved, "utf8")),
          acl,
          zone: "personal",
          updatedAt: info.mtime.toISOString(),
        });
      }
    }
  };
  await visit(root);
  return docs.sort((left, right) => left.address.localeCompare(right.address));
};
