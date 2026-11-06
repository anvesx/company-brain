import fc from "fast-check";
import { decodeJwt } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IdentityError } from "../../src/index.js";
import { signUp } from "../support/http.js";
import { bearer, connect } from "../support/oauth.js";
import { boot, type Env } from "../support/server.js";

let env: Env;
let token: string;
beforeAll(async () => {
  env = await boot();
  const ada = await signUp(env, "Ada");
  token = (await connect(ada.browser, env.base, env.config.resource)).tokens.access_token;
});
afterAll(() => env.close());

const reencode = (claims: Record<string, unknown>): string => {
  const [head, , sig] = token.split(".");
  return `${head}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${sig}`;
};
const replacement = fc.oneof(fc.string(), fc.integer(), fc.constant(null), fc.array(fc.string(), { maxLength: 2 }));

describe("claims property", () => {
  it("rule 8: the untouched token verifies (the property is not vacuous)", async () => {
    expect((await env.identity.port.fromBearer(new Headers(bearer(token))))?.kind).toBe("mcp");
  });

  it("rule 8: altering any single claim without re-signing fails verification", async () => {
    const claims = decodeJwt(token) as Record<string, unknown>;
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...Object.keys(claims)), replacement, async (key, value) => {
        fc.pre(JSON.stringify(value) !== JSON.stringify(claims[key]));
        const altered = reencode({ ...claims, [key]: value });
        const outcome = await env.identity.port.fromBearer(new Headers(bearer(altered))).then(
          () => "accepted",
          (error: unknown) => error,
        );
        expect(outcome, key).toBeInstanceOf(IdentityError);
      }),
      { numRuns: 100 },
    );
  });
});
