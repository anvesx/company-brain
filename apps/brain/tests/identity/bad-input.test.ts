import { afterEach, describe, expect, it } from "vitest";
import { bootBrain, type Env, signUp } from "./boot.js";

let env: Env | undefined;
afterEach(async () => env?.close());

const get = async (path: string) => {
  env = await bootBrain();
  const ann = await signUp(env, "Ann");
  const res = await fetch(`${env.base}${path}`, { headers: { cookie: ann.browser.cookie() } });
  return { status: res.status, body: (await res.json()) as { error: string; message?: string } };
};

// The graph store rejects NUL and lone surrogates with BAD_INPUT. A caller's bad input is a 400 with a reason, never the generic 500.
describe("a /v1 route answers bad input with 400, not 500", () => {
  it("GET /v1/documents/%00 (a NUL in the id) is 400 bad_input", async () => {
    const { status, body } = await get("/v1/documents/%00");
    expect([status, body.error]).toEqual([400, "bad_input"]);
    expect(body.message).toMatch(/NUL/);
  });

  // A lone surrogate cannot arrive in a URL: the router decodes invalid UTF-8 to U+FFFD. The id is still a well-formed string, so it is just unknown.
  it("GET /v1/documents/<invalid UTF-8 for a lone surrogate> is a plain 404, not a 500", async () => {
    expect(await get("/v1/documents/%ED%A0%80")).toEqual({ status: 404, body: { error: "not found" } });
  });

  it("GET /v1/documents/<5000 characters> is a plain 404, not a 500", async () => {
    expect(await get(`/v1/documents/${"a".repeat(5000)}`)).toEqual({ status: 404, body: { error: "not found" } });
  });

  it.each(["cursor=%00", "cursor=%ED%A0%80", `cursor=${"a".repeat(5000)}`, "limit=%00", "asOf=%00"])("GET /v1/graph?%s is 400 bad_input", async (query) => {
    const { status, body } = await get(`/v1/graph?${query}`);
    expect([status, body.error]).toEqual([400, "bad_input"]);
  });
});
