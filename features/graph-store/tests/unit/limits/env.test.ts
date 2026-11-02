import { describe, expect, it } from "vitest";
import { withEnv } from "../../support/env.js";

describe("withEnv", () => {
  it("restores an absent variable as absent, not the string 'undefined'", () => {
    delete process.env["GS_ENV_PROBE"];
    withEnv({ GS_ENV_PROBE: "x" }, () => expect(process.env["GS_ENV_PROBE"]).toBe("x"));
    expect("GS_ENV_PROBE" in process.env).toBe(false);
  });
  it("restores a present variable and supports deleting inside", () => {
    process.env["GS_ENV_PROBE"] = "orig";
    withEnv({ GS_ENV_PROBE: undefined }, () => expect(process.env["GS_ENV_PROBE"]).toBeUndefined());
    expect(process.env["GS_ENV_PROBE"]).toBe("orig");
    delete process.env["GS_ENV_PROBE"];
  });
  it("restores when fn throws", () => {
    delete process.env["GS_ENV_PROBE"];
    expect(() =>
      withEnv({ GS_ENV_PROBE: "x" }, () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect("GS_ENV_PROBE" in process.env).toBe(false);
  });
});
