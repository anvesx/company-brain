import { describe, expect, it } from "vitest";
import { IDENTITY_ERROR_CODES, IdentityError } from "../../src/index.js";

describe("IdentityError", () => {
  it("rule 13: the five codes are exactly the spec's", () => {
    expect([...IDENTITY_ERROR_CODES].sort()).toEqual(["BAD_INPUT", "EXPIRED", "NO_ORGANIZATION", "UNAUTHENTICATED", "WRONG_AUDIENCE"]);
  });

  it("rule 13: BAD_INPUT names the field in the message and on the error", () => {
    const error = new IdentityError("BAD_INPUT", "must be 12 to 128 characters", "password");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("IdentityError");
    expect(error.code).toBe("BAD_INPUT");
    expect(error.field).toBe("password");
    expect(error.message).toBe("password: must be 12 to 128 characters");
  });

  it("rule 8: a code without a field keeps the message as given", () => {
    const error = new IdentityError("EXPIRED", "token expired");
    expect(error.field).toBeUndefined();
    expect(error.message).toBe("token expired");
  });
});
