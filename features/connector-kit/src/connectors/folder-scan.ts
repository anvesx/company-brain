import { lstat, readdir, readFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import { ConnectorError, type ListedDoc, type Skipped } from "../core/contract.js";
import { aclVersion, readAcl } from "./folder-acl.js";
import { safeRealpath } from "./folder-path.js";

export type Scan = { docs: ListedDoc[]; skipped: Skipped[] };

const gone = (error: unknown): boolean => (error as { code?: string }).code === "ENOENT" || (error instanceof ConnectorError && error.code === "NOT_FOUND");

/** Walks the tree. An entry with a bad sidecar or one that vanishes mid-scan is skipped and reported; a path escape still throws. */
export const scan = async (root: string): Promise<Scan> => {
  const docs: ListedDoc[] = [];
  const skipped: Skipped[] = [];
  const visited = new Set<string>();
  const addr = (shown: string): string => relative(root, shown).split(sep).join("/");
  const entryOf = async (shown: string): Promise<void> => {
    const resolved = await safeRealpath(root, shown);
    const info = await lstat(resolved);
    if (info.isDirectory()) return visit(resolved, shown);
    if (!info.isFile()) return;
    const acl = await readAcl(root, shown);
    const version = aclVersion(info, acl, await readFile(resolved, "utf8"));
    docs.push({ address: addr(shown), title: basename(shown), version, acl, zone: "personal", updatedAt: info.mtime.toISOString() });
  };
  const attempt = async (shown: string, work: () => Promise<void>): Promise<void> => {
    try {
      await work();
    } catch (error: unknown) {
      if (error instanceof ConnectorError && error.code === "BAD_ACL") skipped.push({ address: addr(shown), code: "BAD_ACL", message: error.message });
      else if (gone(error)) skipped.push({ address: addr(shown), code: "VANISHED", message: "entry disappeared during the scan" });
      else throw error;
    }
  };
  // `path` is the real directory (entries are joined onto it); `shown` only names the directory in a skip report.
  const visit = async (path: string, shown: string): Promise<void> => {
    if (visited.has(path)) return;
    visited.add(path);
    await attempt(shown, async () => {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        const child = join(path, entry.name);
        if (!entry.name.endsWith(".acl.json")) await attempt(child, () => entryOf(child));
      }
    });
  };
  await visit(root, root);
  return { docs: docs.sort((left, right) => left.address.localeCompare(right.address)), skipped };
};
