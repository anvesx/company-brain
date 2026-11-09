import { StreamableHTTPTransport } from "@hono/mcp";
import { describe, expect, it } from "vitest";
import { createSessions } from "../../../src/server/sessions.js";

// The session store rejects a bad cap with a message an operator can read in the startup log.
const MSG = "session cap must be a positive whole number";
const t = new StreamableHTTPTransport(); // a real transport, never connected
const who = { user: "u", tenant: "t" };

describe("session cap validation", () => {
  it.each([0, -1, 1.5, Number.NaN])("cap %s throws RangeError with the exact message", (cap) => {
    expect(() => createSessions(cap)).toThrow(new RangeError(MSG));
    expect(() => createSessions(cap)).toThrow(MSG);
  });

  it("cap 1 is valid, and holds exactly one session (the next one evicts it)", () => {
    const s = createSessions(1);
    s.add("a", who, t);
    s.add("b", who, t);
    expect(s.size()).toBe(1);
    expect(s.get("a", who)).toBeUndefined();
    expect(s.get("b", who)).toBe(t);
  });
});
