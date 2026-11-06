import { StreamableHTTPTransport } from "@hono/mcp";
import { describe, expect, it } from "vitest";
import { createSessions, DEFAULT_SESSION_CAP } from "../../src/server/sessions.js";

// The session store holds one live transport per MCP session, bound to the caller who opened it.
// Real @hono/mcp transports are stored, so eviction is proven by their own onclose firing.
const ada = { user: "u-ada", tenant: "org-1" };
const bob = { user: "u-bob", tenant: "org-1" };

const transport = (closed: string[], id: string) => {
  const t = new StreamableHTTPTransport();
  t.onclose = () => closed.push(id);
  return t;
};

describe("session store", () => {
  it("caps at 10,000 sessions by default", () => {
    expect(DEFAULT_SESSION_CAP).toBe(10_000);
    expect(createSessions().cap).toBe(10_000);
  });

  it("returns a session only to the caller who opened it", () => {
    const s = createSessions(4);
    const t = new StreamableHTTPTransport();
    s.add("s1", ada, t);
    expect(s.get("s1", ada)).toBe(t);
    expect(s.get("s1", bob)).toBeUndefined();
    expect(s.get("s1", { user: "u-ada", tenant: "org-2" })).toBeUndefined();
    expect(s.get("nope", ada)).toBeUndefined();
  });

  it("evicts and closes the least recently used session when full", async () => {
    const closed: string[] = [];
    const s = createSessions(2);
    s.add("s1", ada, transport(closed, "s1"));
    s.add("s2", ada, transport(closed, "s2"));
    s.get("s1", ada); // s1 is now the most recently used, so s2 is the eviction candidate
    s.add("s3", bob, transport(closed, "s3"));
    await Promise.resolve();
    expect(closed).toEqual(["s2"]);
    expect(s.size()).toBe(2);
    expect(s.get("s2", ada)).toBeUndefined();
    expect(s.get("s1", ada)).toBeDefined();
    expect(s.get("s3", bob)).toBeDefined();
  });

  it("a failed owner check does not count as use", async () => {
    const closed: string[] = [];
    const s = createSessions(2);
    s.add("s1", ada, transport(closed, "s1"));
    s.add("s2", ada, transport(closed, "s2"));
    s.get("s1", bob); // wrong owner: must not refresh s1
    s.add("s3", ada, transport(closed, "s3"));
    await Promise.resolve();
    expect(closed).toEqual(["s1"]);
  });

  it("delete closes the session and frees its slot", async () => {
    const closed: string[] = [];
    const s = createSessions(2);
    s.add("s1", ada, transport(closed, "s1"));
    expect(s.delete("s1")).toBe(true);
    await Promise.resolve();
    expect(closed).toEqual(["s1"]);
    expect(s.size()).toBe(0);
    expect(s.delete("s1")).toBe(false);
  });

  it("rejects a cap below one", () => {
    expect(() => createSessions(0)).toThrow();
    expect(() => createSessions(1.5)).toThrow();
  });
});
