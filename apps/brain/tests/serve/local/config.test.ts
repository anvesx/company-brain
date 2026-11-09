import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IdentityError } from "@anvesx/identity";
import { describe, expect, it } from "vitest";
import { readServeConfig } from "../../../src/serve/local/config.js";
import { explain } from "../../../src/serve/local/start.js";
import { oneLine, run } from "./run.js";

/** The binary must refuse in one line, exit 1 and leave the folder exactly as it found it. */
const refused = (r: ReturnType<typeof run>, line: string) => {
  expect([r.code, r.err]).toEqual([1, line.replaceAll("{dir}", r.dir)]);
  oneLine(r.err);
  expect(r.after).toEqual(r.before);
};

describe("brain refuses settings that would crash after creating files", () => {
  it.each(["0x50", "1e3", " 80", "+80", "8e1"])("refuses BRAIN_PORT=%s", (port) => {
    const r = run({ BRAIN_PORT: port });
    expect(r.code).toBe(1);
    expect(r.err).toContain("brain: BRAIN_PORT must be a whole number from 1 to 65535");
    oneLine(r.err);
  });

  // An origin only: @better-auth/mcp throws a plain TypeError on a query or fragment, after auth.db exists.
  it.each(["ftp://x", "https://example.com?x=1", "https://example.com#frag", "http://localhost:1234/sub"])(
    "refuses BRAIN_BASE_URL=%s before any database is made",
    (url) =>
      refused(
        run({ BRAIN_BASE_URL: url }),
        `brain: BRAIN_BASE_URL must be an origin (https, or http on localhost) with no path, query or fragment, got "${url}"\n`,
      ),
  );

  // The same origin written another way is accepted and the better-auth baseURL gets the normalised form.
  it.each([
    ["HTTPS://EXAMPLE.COM", "https://example.com"],
    ["https://example.com:443", "https://example.com"],
    ["http://LOCALHOST:5", "http://localhost:5"],
    ["https://example.com/", "https://example.com"],
    ["http://127.0.0.1:8787/", "http://127.0.0.1:8787"],
  ])("accepts BRAIN_BASE_URL=%s as %s", (given, origin) => {
    const env = { BRAIN_GRAPH_PATH: join(tmpdir(), "g.db"), BRAIN_AUTH_DB: join(tmpdir(), "a.db"), BRAIN_AUTH_SECRET: "x".repeat(32), BRAIN_BASE_URL: given };
    expect(readServeConfig(env).baseUrl).toBe(origin);
  });

  it("refuses a graph path that is a directory", () => {
    const r = run({}, [], (d) => mkdirSync(join(d, "g.db")));
    refused(r, "brain: BRAIN_GRAPH_PATH: {dir}/g.db is a directory, not a file\n");
  });

  it("refuses a graph path that is not a SQLite file", () => {
    const r = run({}, [], (d) => writeFileSync(join(d, "g.db"), "just some text, not sqlite"));
    refused(r, "brain: BRAIN_GRAPH_PATH: {dir}/g.db is not a SQLite database\n");
  });

  it("refuses a read-only graph file", () => {
    const r = run({}, [], (d) => {
      writeFileSync(join(d, "g.db"), "");
      chmodSync(join(d, "g.db"), 0o444);
    });
    refused(r, "brain: BRAIN_GRAPH_PATH: cannot write {dir}/g.db\n");
  });

  it("explain gives one line for EACCES, a sqlite failure and an identity setting without doubling the field", () => {
    expect(explain(Object.assign(new Error("listen EACCES: permission denied 127.0.0.1:80"), { code: "EACCES" }), 80)).toBe(
      "listen EACCES: permission denied 127.0.0.1:80",
    );
    expect(explain(Object.assign(new Error("file is not a database"), { code: "ERR_SQLITE_ERROR" }), 80)).toBe("database: file is not a database");
    expect(explain(new IdentityError("BAD_INPUT", "must be https", "baseUrl"), 80)).toBe("baseUrl: must be https");
  });
});
