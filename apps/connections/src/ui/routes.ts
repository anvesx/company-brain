import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Context, Hono } from "hono";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};
const POLICY = "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

/** `src/ui/public`, found beside this file whether it runs from `src` or from `dist`. */
const assetDir = (): string => {
  const here = dirname(fileURLToPath(import.meta.url));
  return [join(here, "public"), join(here, "../../src/ui/public")].find(existsSync) ?? join(here, "public");
};

/** Every servable file as a url path under `/ui/`. Only names found here are served, so no request can leave the folder. */
const listAssets = (dir: string): Map<string, string> => {
  const found = new Map<string, string>();
  for (const e of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (e.isFile() && extname(e.name) in TYPES) {
      const full = join(e.parentPath, e.name);
      found.set(
        full
          .slice(dir.length + 1)
          .split("\\")
          .join("/"),
        full,
      );
    }
  }
  return found;
};

const send = (c: Context, file: string): Response =>
  c.body(readFileSync(file, "utf8"), 200, {
    "content-type": TYPES[extname(file)] ?? "text/plain",
    "content-security-policy": POLICY,
    "cache-control": "no-store",
  });

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return "";
  }
};

/** `GET /` serves the page and `GET /ui/*` its scripts and styles, read from disk on each request. */
export function uiRoutes(dir: string = assetDir()): Hono {
  const r = new Hono();
  r.get("/", (c) => send(c, join(dir, "index.html")));
  r.get("/ui/*", (c) => {
    const name = c.req.path.slice("/ui/".length);
    const file = listAssets(dir).get(safeDecode(name));
    return file ? send(c, file) : c.json({ error: "not found" }, 404);
  });
  return r;
}
