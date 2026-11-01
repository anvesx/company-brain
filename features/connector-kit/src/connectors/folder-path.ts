import { realpath } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";
import { ConnectorError } from "../core/contract.js";

export const escapes = (root: string, target: string): boolean => {
  const path = relative(root, target);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
};

export const safeRealpath = async (root: string, path: string): Promise<string> => {
  try {
    const resolved = await realpath(path);
    if (escapes(root, resolved)) throw new ConnectorError("PATH_ESCAPE", `Path leaves root: ${path}`);
    return resolved;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") {
      throw new ConnectorError("NOT_FOUND", `Document not found: ${path}`);
    }
    throw error;
  }
};
