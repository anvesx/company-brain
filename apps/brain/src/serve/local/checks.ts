import { accessSync, closeSync, constants, openSync, readSync, statSync } from "node:fs";
import { dirname } from "node:path";

/** A bad setting. `bin.ts` prints the message on one line and exits 1. */
export class ConfigError extends Error {
  override readonly name = "ConfigError";
}

/** The folder a new SQLite file will be created in must exist and accept writes. */
export const writableDir = (name: string, file: string): void => {
  try {
    accessSync(dirname(file), constants.W_OK);
  } catch {
    throw new ConfigError(`${name}: cannot write in ${dirname(file)}`);
  }
};

/** A SQLite file starts with these 16 bytes; anything else would only fail later, after other files were made. */
const SQLITE_MAGIC = "SQLite format 3\0";

/** A path that already exists must be a regular, writable file that is empty or already SQLite. A missing one is fine. */
export const usableFile = (name: string, file: string): void => {
  let info: ReturnType<typeof statSync>;
  try {
    info = statSync(file);
  } catch {
    return; // not there yet: the database will create it
  }
  if (info.isDirectory()) throw new ConfigError(`${name}: ${file} is a directory, not a file`);
  try {
    accessSync(file, constants.W_OK);
  } catch {
    throw new ConfigError(`${name}: cannot write ${file}`);
  }
  if (info.size === 0) return;
  const head = Buffer.alloc(SQLITE_MAGIC.length);
  const fd = openSync(file, "r");
  try {
    readSync(fd, head, 0, head.length, 0);
  } finally {
    closeSync(fd);
  }
  if (head.toString("latin1") !== SQLITE_MAGIC) throw new ConfigError(`${name}: ${file} is not a SQLite database`);
};

/**
 * Same rule identity applies later (https, or http on this machine), plus origin-only: @better-auth/mcp
 * throws a plain TypeError on a query or fragment, and a path would double up in the mcp resource id.
 * Checked here so no database file is made first. Returns the origin in its one canonical form: URL lower-cases
 * the scheme and host and drops the default port, and a single trailing slash is no path at all.
 */
export const checkBaseUrl = (url: string): string => {
  const u = URL.canParse(url) ? new URL(url) : undefined;
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u?.hostname ?? "");
  const scheme = u?.protocol === "https:" || (u?.protocol === "http:" && local);
  // "?" and "#" are looked for in the text: an empty query or fragment leaves u.search and u.hash empty.
  const bare = u !== undefined && u.pathname === "/" && !u.username && !u.password && !/[?#]/.test(url);
  if (!u || !scheme || !bare) {
    throw new ConfigError(`BRAIN_BASE_URL must be an origin (https, or http on localhost) with no path, query or fragment, got "${url}"`);
  }
  return u.origin;
};
