import { describe, expect, it } from "vitest";
import { call, connect, docs, idsOf, start } from "../harness.js";

describe("brain app over MCP HTTP", () => {
  it("returns only the documents the caller may see", async () => {
    const { app } = await start();
    expect(await app.ingest("t1")).toMatchObject({ emitted: 3, indexed: 3, failed: 0 });
    const alice = await connect(app.port, "alice:t1");
    expect(idsOf(await call(alice))).toEqual(["a", "b"]);
    const bob = await connect(app.port, "bob:t1");
    expect(idsOf(await call(bob))).toEqual(["hidden"]);
    await alice.close();
    await bob.close();
    await app.close();
  });

  it("never returns another tenant's documents", async () => {
    const { app } = await start();
    await app.ingest("t1");
    await app.ingest("t2");
    const client = await connect(app.port, "alice:t2");
    expect(idsOf(await call(client))).toEqual(["a", "b"]);
    const stranger = await connect(app.port, "alice:t3");
    expect(idsOf(await call(stranger))).toEqual([]);
    await client.close();
    await stranger.close();
    await app.close();
  });

  it("answers 401 without credentials", async () => {
    const { app } = await start();
    const res = await fetch(`http://127.0.0.1:${app.port}/mcp`, { method: "POST" });
    expect(res.status).toBe(401);
    await app.close();
  });

  it("close is idempotent and frees the port", async () => {
    const { app } = await start();
    const port = app.port;
    await app.close();
    await app.close();
    await expect(fetch(`http://127.0.0.1:${port}/mcp`, { method: "POST" })).rejects.toThrow();
    expect(docs()).toHaveLength(3);
  });
});
