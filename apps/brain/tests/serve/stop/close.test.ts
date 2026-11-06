import { connect } from "node:net";
import { describe, expect, it } from "vitest";
import { serve } from "../../../src/serve/serve.js";
import { env } from "../boot.js";

// serve() against a port nothing listens on: the boot fails at once with ECONNREFUSED (transient) and would
// retry every BRAIN_RETRY_MS. close() has to stop that loop and must not wait for a client that is still
// sending its request, or a deploy's drain step would hang until the 60 s headers timeout.
const unreachable = "postgres://postgres:x@127.0.0.1:1/postgres";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("close()", () => {
  it("stops the retry loop: no retry is logged after close() returns", async () => {
    const logs: string[] = [];
    const app = await serve({ ...env(unreachable), BRAIN_RETRY_MS: "20" }, (m) => logs.push(m));
    await app.close(); // arrives while the first boot attempt is still connecting
    const seen = logs.filter((m) => /retrying/.test(m)).length;
    await sleep(300); // 15 retry periods
    expect(logs.filter((m) => /retrying/.test(m)).length).toBe(seen);
    expect(seen).toBe(0); // the attempt that close() interrupted is not a failure, so it is not logged either
  });

  it("does not wait for a client that is still sending its request headers", async () => {
    const app = await serve({ ...env(unreachable), BRAIN_RETRY_MS: "60000" }, () => {});
    const socket = connect(app.port, "127.0.0.1");
    await new Promise<void>((ok) => socket.once("connect", ok));
    socket.write("GET /healthz HTTP/1.1\r\nHost: x\r\n"); // no blank line: the request never completes
    await sleep(100);
    const t0 = Date.now();
    await app.close();
    expect(Date.now() - t0).toBeLessThan(2000);
    socket.destroy();
  });
});
