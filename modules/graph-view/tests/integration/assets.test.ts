import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, type Env } from "../support/server.js";
import { openLongStore } from "../support/store.js";

let env: Env;
let drop: () => void;
beforeAll(async () => {
  const opened = openLongStore();
  drop = opened.drop;
  env = await boot(opened.store);
});
afterAll(async () => [await env?.close(), drop?.()]);

// The installed packages on disk. The routes must serve these files unchanged, the way identity
// serves @simplewebauthn/browser at /webauthn.js (features/identity/src/pages/passkey/assets.ts).
const resolve = createRequire(import.meta.url).resolve;
const forceGraphUmd = join(dirname(resolve("3d-force-graph")), "3d-force-graph.min.js");
const threeRoot = join(dirname(resolve("three")), "..");

describe("rule 5: library files served byte for byte from node_modules", () => {
  it("/3d-force-graph.js is the installed UMD build, public, as JavaScript", async () => {
    // One fetch, body read once: a second fetch with the first body unread leaves a half-used socket in the pool.
    const res = await fetch(`${env.base}/3d-force-graph.js`);
    const body = Buffer.from(await res.arrayBuffer());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/javascript/);
    // Buffer.equals is a memcmp; expect(buf).toEqual(buf) walks 1.4 MB element by element (seconds under Stryker).
    expect(body.equals(await readFile(forceGraphUmd)), "body differs from the installed file").toBe(true);
  });

  it.each([
    "build/three.module.js",
    "build/three.core.js",
    "examples/jsm/postprocessing/UnrealBloomPass.js",
    "examples/jsm/postprocessing/Pass.js",
    "examples/jsm/shaders/CopyShader.js",
    "examples/jsm/shaders/LuminosityHighPassShader.js",
  ])("/vendor/three/%s is the installed three file", async (file) => {
    // One fetch whose body is read to the end: an unread body on a keep-alive socket can surface
    // as ECONNRESET on the next request under load, which is a test artefact, not a server defect.
    const res = await fetch(`${env.base}/vendor/three/${file}`);
    const body = Buffer.from(await res.arrayBuffer());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/javascript/);
    expect(body.equals(await readFile(join(threeRoot, file))), `body differs from the installed ${file}`).toBe(true);
  });

  it.each(["package.json", "build/three.cjs", "examples/jsm/controls/OrbitControls.js", "..%2Fpackage.json", "..%2F..%2F..%2Fpackage.json"])(
    "/vendor/three/%s is outside the allowlist and answers 404",
    async (file) => {
      expect((await fetch(`${env.base}/vendor/three/${file}`)).status).toBe(404);
    },
  );
});
