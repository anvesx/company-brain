import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Hono } from "hono";
import { PASSKEY_SCRIPT } from "./script.js";

/**
 * Where `@simplewebauthn/browser` keeps its browser bundle. Its package exports do not list the bundle, so it is
 * found from the package's main file, which Node resolves for us; the path is then a plain file read.
 */
const bundlePath = (): string => {
  const main = createRequire(import.meta.url).resolve("@simplewebauthn/browser");
  return join(dirname(main), "..", "dist", "bundle", "index.umd.min.js");
};

const JS = { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=3600" };

/**
 * The two scripts the passkey pages load: the WebAuthn library (read from node_modules once and kept in memory)
 * and our own glue in `script.ts`. Both are GET, so the Origin guard lets them through, and both are cacheable.
 */
export const mountPasskeyAssets = (app: Hono): void => {
  let bundle: Promise<string> | undefined;
  app.get("/webauthn.js", async () => {
    bundle ??= readFile(bundlePath(), "utf8");
    return new Response(await bundle, { headers: JS });
  });
  app.get("/passkey.js", () => new Response(PASSKEY_SCRIPT, { headers: JS }));
};
