import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { env, spawnServe } from "../boot.js";

// Bad DATABASE_URL / BRAIN_RETRY_MS must be one fatal line, not an endless retry loop. Needs `pnpm build` first.
const bin = fileURLToPath(new URL("../../../dist/bin.js", import.meta.url));
if (!existsSync(bin)) throw new Error("dist/bin.js is missing: run `pnpm --filter @anvesx/brain-app build` first"); // build is a prerequisite: fail, never skip
const run = (e: Record<string, string>) => spawnServe(bin, e).exit;
const good = "postgres://x:y@127.0.0.1:1/z";

describe("serve validates its numbers and URLs before it starts", () => {
  it.each(["abc", "", "0", "-5", "1.5", "NaN"])("BRAIN_RETRY_MS=%j is fatal", async (v) => {
    const r = await run({ ...env(good), BRAIN_RETRY_MS: v });
    expect(r.code).toBe(1);
    expect(r.err.trim()).toBe("brain: BRAIN_RETRY_MS must be a positive integer");
  });

  it.each(["notaurl", "mysql://u:p@h/db", "postgres://", "http://localhost/x"])("DATABASE_URL=%j is fatal", async (v) => {
    const r = await run({ ...env(v) });
    expect(r.code).toBe(1);
    expect(r.err.trim()).toBe("brain: DATABASE_URL must be a postgres:// or postgresql:// URL with a host");
  });
});
