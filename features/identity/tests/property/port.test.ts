import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IdentityError } from "../../src/index.js";
import { boot, type Env } from "../support/server.js";

let env: Env;
beforeAll(async () => {
  env = await boot();
});
afterAll(() => env.close());

const printable = fc.string({ unit: fc.integer({ min: 0x20, max: 0x7e }).map((c) => String.fromCharCode(c)), maxLength: 120 });
const headers = fc.record({
  authorization: fc.option(
    fc.oneof(
      printable,
      printable.map((s) => `Bearer ${s}`),
    ),
    { nil: undefined },
  ),
  cookie: fc.option(
    fc.oneof(
      printable,
      printable.map((s) => `better-auth.session_token=${s}`),
    ),
    { nil: undefined },
  ),
});

describe("identity port properties", () => {
  it("rule 8: require on arbitrary headers only ever throws IdentityError", async () => {
    await fc.assert(
      fc.asyncProperty(headers, async (h) => {
        const init = Object.fromEntries(Object.entries(h).filter(([, v]) => v !== undefined)) as Record<string, string>;
        const outcome = await env.identity.port.require(new Headers(init)).then(
          () => "caller",
          (error: unknown) => error,
        );
        expect(outcome).toBeInstanceOf(IdentityError);
      }),
      { numRuns: 200 },
    );
  });
});
