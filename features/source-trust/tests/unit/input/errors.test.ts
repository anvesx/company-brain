import { describe, expect, it } from "vitest";
import { badInput, TrustError } from "../../../src/errors.js";

describe("errors", () => {
  it("rule 12: TrustError carries code BAD_INPUT, the field, and the field in its message", () => {
    const error = badInput("claims[3].value", "empty");
    expect(error).toBeInstanceOf(TrustError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("BAD_INPUT");
    expect(error.field).toBe("claims[3].value");
    expect(error.name).toBe("TrustError");
    expect(error.message).toBe("claims[3].value: empty");
  });
});
