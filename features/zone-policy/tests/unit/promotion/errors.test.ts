import { describe, expect, it } from "vitest";
import { PromotionError } from "../../../src/index.js";

describe("PromotionError", () => {
  it("is an Error that carries a stable code", () => {
    const error = new PromotionError("NOT_OUTWARD", "demotion is not allowed");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PromotionError);
    expect(error.code).toBe("NOT_OUTWARD");
    expect(error.message).toBe("demotion is not allowed");
    expect(error.name).toBe("PromotionError");
  });

  it("accepts every promotion code, including NO_COMMON_ZONE and NOT_MEMBER", () => {
    const codes = ["NO_CONSENT", "NOT_OUTWARD", "NOT_OWNER", "NO_COMMON_ZONE", "NOT_MEMBER"] as const;
    expect(codes.map((code) => new PromotionError(code, "x").code)).toEqual([...codes]);
  });
});
