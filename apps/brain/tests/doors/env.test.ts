import { describe, expect, it } from "vitest";
import { doorsFromEnv, sealKeyFrom } from "../../src/doors/env.js";
import { oneLine, run } from "../serve/local/run.js";

const SECRET = "brain-doors-test-secret-0123456789abcdef";
const HEX64 = "ab".repeat(32);

describe("doorsFromEnv", () => {
  it("with nothing set: no Google, the whole catalog, a seal key derived from the auth secret", () => {
    const doors = doorsFromEnv({}, SECRET);
    expect(doors.google).toBeUndefined();
    expect(doors.providers?.map((p) => p.id)).toEqual(["github", "google-drive", "slack"]);
    expect(doors.sealKey).toBe(sealKeyFrom(SECRET));
    expect(doors.catalog?.map((c) => c.name)).toEqual(["GitHub", "Google Drive", "Slack"]);
    expect(doors.sealKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("derives a different seal key from a different secret, and never the cursor key's bytes", () => {
    expect(sealKeyFrom(SECRET)).not.toBe(sealKeyFrom(`${SECRET}x`));
    expect(sealKeyFrom(SECRET)).toBe(sealKeyFrom(SECRET)); // stable across instances
  });

  it("takes an explicit BRAIN_SEAL_KEY over the derived one", () => {
    expect(doorsFromEnv({ BRAIN_SEAL_KEY: HEX64 }, SECRET).sealKey).toBe(HEX64);
  });

  it.each(["short", "zz".repeat(32), `${HEX64}0`])("refuses BRAIN_SEAL_KEY=%s", (key) => {
    expect(() => doorsFromEnv({ BRAIN_SEAL_KEY: key }, SECRET)).toThrow("BRAIN_SEAL_KEY must be 64 hex characters (32 bytes)");
  });

  it("switches Google on only when both id and secret are set", () => {
    const env = { GOOGLE_CLIENT_ID: "id-1", GOOGLE_CLIENT_SECRET: "secret-1" };
    expect(doorsFromEnv(env, SECRET).google).toEqual({ clientId: "id-1", clientSecret: "secret-1" });
    const half = "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET go together: set both or neither";
    expect(() => doorsFromEnv({ GOOGLE_CLIENT_ID: "id-1" }, SECRET)).toThrow(half);
    expect(() => doorsFromEnv({ GOOGLE_CLIENT_SECRET: "secret-1" }, SECRET)).toThrow(half);
    expect(() => doorsFromEnv({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "s" }, SECRET)).toThrow(half); // empty counts as unset
  });

  it("hands the same env through, so identity reads <ID>_CLIENT_ID where this did", () => {
    const env = { GITHUB_CLIENT_ID: "g", GITHUB_CLIENT_SECRET: "s" };
    expect(doorsFromEnv(env, SECRET).env).toBe(env);
  });
});

describe("the built binary refuses a bad door in one line, before any database is made", () => {
  it("half a Google pair", () => {
    const r = run({ GOOGLE_CLIENT_ID: "only-the-id" });
    expect([r.code, r.err]).toEqual([1, "brain: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET go together: set both or neither\n"]);
    oneLine(r.err);
  });

  it("a seal key that is not 64 hex characters", () => {
    const r = run({ BRAIN_SEAL_KEY: "not-hex" });
    expect([r.code, r.err]).toEqual([1, "brain: BRAIN_SEAL_KEY must be 64 hex characters (32 bytes)\n"]);
  });
});
