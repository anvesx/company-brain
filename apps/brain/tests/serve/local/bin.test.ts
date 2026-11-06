import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BIN, oneLine, run } from "./run.js";

describe("brain binary refuses a bad setting in one line", () => {
  it("the built binary exists", () => expect(existsSync(BIN)).toBe(true));

  it("refuses a short secret, before any database is made", () => {
    const r = run({ BRAIN_AUTH_SECRET: "short" });
    expect(r.code).toBe(1);
    expect(r.err).toBe("brain: BRAIN_AUTH_SECRET must be at least 32 characters\n");
    expect(existsSync(join(r.dir, "a.db"))).toBe(false);
    expect(existsSync(join(r.dir, "g.db"))).toBe(false);
  });

  it("refuses a missing secret", () => {
    const r = run({ BRAIN_AUTH_SECRET: "" });
    expect([r.code, r.err]).toEqual([1, "brain: BRAIN_AUTH_SECRET is required\n"]);
  });

  it.each(["abc", "0", "70000", "80.5"])("refuses BRAIN_PORT=%s", (port) => {
    const r = run({ BRAIN_PORT: port });
    expect(r.code).toBe(1);
    expect(r.err).toContain("brain: BRAIN_PORT must be a whole number from 1 to 65535");
    oneLine(r.err);
  });

  it("refuses a graph path in a folder that does not exist", () => {
    const r = run({ BRAIN_GRAPH_PATH: "/nonexistent-brain-dir/g.db" });
    expect([r.code, r.err]).toEqual([1, "brain: BRAIN_GRAPH_PATH: cannot write in /nonexistent-brain-dir\n"]);
    expect(existsSync(join(r.dir, "a.db"))).toBe(false);
  });

  it("says which port is in use", async () => {
    const taken = createServer();
    await new Promise<void>((ok) => taken.listen(0, "127.0.0.1", ok));
    const port = (taken.address() as { port: number }).port;
    const r = run({ BRAIN_PORT: String(port), BRAIN_HOST: "127.0.0.1" });
    taken.close();
    expect([r.code, r.err]).toEqual([1, `brain: port ${port} in use\n`]);
  });

  it("prints a usage line and exits 2 for an unknown argument", () => {
    const r = run({}, ["serv"]);
    expect(r.code).toBe(2);
    expect(r.err).toBe("usage: brain [sync|serve]   (no argument starts the local server)\n");
  });
});
