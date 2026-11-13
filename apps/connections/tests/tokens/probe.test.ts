import { describe, expect, it } from "vitest";
import { probeToken } from "../../src/tokens/probe.js";

describe("probeToken", () => {
  it("cannot tell when the provider is unreachable, and rejects a provider it has no probe for", async () => {
    expect(await probeToken("github", "http://127.0.0.1:1", "t")).toBe("unknown");
    expect(await probeToken("drive", undefined, "t")).toBe("rejected");
  });
});
