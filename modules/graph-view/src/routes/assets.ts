import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Hono } from "hono";

const JS = { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=3600" };
const resolve = createRequire(import.meta.url).resolve;
const script = (bytes: Uint8Array): Response => new Response(bytes as BodyInit, { headers: JS });

/** The only files of `three` the page may load (spec rule 9): the core, the bloom pass and what the bloom pass imports. */
const THREE_FILES = [
  "build/three.module.js",
  "build/three.core.js",
  "examples/jsm/postprocessing/UnrealBloomPass.js",
  "examples/jsm/postprocessing/Pass.js",
  "examples/jsm/shaders/CopyShader.js",
  "examples/jsm/shaders/LuminosityHighPassShader.js",
];
const PREFIX = "/vendor/three/";

/**
 * Serves the installed libraries byte for byte, read once when the routes are mounted. The three files come from a
 * fixed Map, so a path the caller types is only ever a lookup key, never part of a file path.
 */
export function mountAssets(app: Hono): void {
  const forceGraph = readFileSync(join(dirname(resolve("3d-force-graph")), "3d-force-graph.min.js"));
  const threeRoot = join(dirname(resolve("three")), "..");
  const three = new Map(THREE_FILES.map((file) => [file, readFileSync(join(threeRoot, file))]));

  app.get("/3d-force-graph.js", () => script(forceGraph));
  app.get(`${PREFIX}*`, (c) => {
    const file = three.get(c.req.path.slice(PREFIX.length));
    return file ? script(file) : c.notFound();
  });
}
