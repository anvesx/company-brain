import { createServer } from "node:http";
import pg from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { serve } from "../../../src/serve/serve.js";
import { listenOn } from "../../../src/serve/startup.js";
import { env } from "../boot.js";

// Nothing listens on port 1 (privileged, unused), so the boot keeps retrying while these tests look at the
// listen step alone; close() stops it. BRAIN_RETRY_MS is long so no retry lands mid-test.
const unreachable = "postgres://postgres:x@127.0.0.1:1/postgres";
const taken = async () => {
  const s = createServer();
  await new Promise<void>((ok) => s.listen(0, "127.0.0.1", ok));
  return { port: (s.address() as { port: number }).port, free: () => new Promise<void>((ok) => s.close(() => ok())) };
};

afterEach(() => vi.restoreAllMocks());

describe("listenOn", () => {
  it("turns a taken port into `port N in use`", async () => {
    const t = await taken();
    try {
      await expect(listenOn(createServer(), "127.0.0.1", t.port)).rejects.toThrow(new Error(`port ${t.port} in use`));
    } finally {
      await t.free();
    }
  });
  it("passes any other listen error through unchanged", async () => {
    const e = await listenOn(createServer(), "999.999.999.999", 0).catch((x) => x);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).not.toMatch(/in use/);
    expect(e.code).toBeTruthy(); // Node's own error (ENOTFOUND or EAI_*), not one made here
  });
});

describe("serve() listen step", () => {
  it("ends its pool before rejecting on a taken port", async () => {
    const t = await taken();
    const end = vi.spyOn(pg.Pool.prototype, "end");
    try {
      await expect(serve({ ...env(unreachable), PORT: String(t.port), BRAIN_RETRY_MS: "60000" }, () => {})).rejects.toThrow(/in use/);
      expect(end).toHaveBeenCalledTimes(1);
    } finally {
      await t.free();
    }
  });
  it("logs the host and port it was asked to listen on, defaulting the host to 0.0.0.0", async () => {
    const logs: string[] = [];
    const a = await serve({ ...env(unreachable), BRAIN_RETRY_MS: "60000" }, (m) => logs.push(m));
    await a.close();
    expect(logs[0]).toBe("brain listening on 127.0.0.1:0");
    const { HOST: _h, ...noHost } = env(unreachable);
    const b = await serve({ ...noHost, BRAIN_RETRY_MS: "60000" }, (m) => logs.push(m));
    await b.close();
    expect(logs.find((m) => m.startsWith("brain listening on 0.0.0.0"))).toBe("brain listening on 0.0.0.0:0");
  });
});
