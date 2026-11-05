import { describe, expect, it } from "vitest";
import { mapRejection, toRedirect } from "../../../src/routes/errors.js";

const reply = (status: number, body: unknown) => Response.json(body, { status, headers: { "x-keep": "1" } });

describe("toRedirect (better-auth answers authorize with 200 and a url)", () => {
  it("rule 6: a 200 with redirect and url becomes a 302 with that Location and no body headers", async () => {
    const res = await toRedirect(reply(200, { redirect: true, url: "http://127.0.0.1:8765/cb?code=c" }));
    expect([res.status, res.headers.get("location")]).toEqual([302, "http://127.0.0.1:8765/cb?code=c"]);
    expect([res.headers.has("content-type"), res.headers.has("content-length"), res.headers.get("x-keep")]).toEqual([false, false, "1"]);
  });

  it("rule 6: a 200 without redirect true, or without a url, passes through unchanged", async () => {
    for (const body of [{ url: "http://x/" }, { redirect: true }, { redirect: false, url: "http://x/" }]) {
      const res = await toRedirect(reply(200, body));
      expect([res.status, await res.json()]).toEqual([200, body]);
    }
  });

  it("rule 6: a 200 that is not JSON passes through", async () => {
    const res = await toRedirect(new Response("plain", { status: 200 }));
    expect([res.status, await res.text()]).toEqual([200, "plain"]);
  });

  it("rule 6: a status other than 200 passes through even when the body has a url", async () => {
    const res = await toRedirect(reply(201, { redirect: true, url: "http://x/" }));
    expect([res.status, res.headers.get("location")]).toEqual([201, null]);
  });
});

describe("mapRejection (the shapes rule 13 fixes)", () => {
  it("rule 13: a code_verifier complaint is BAD_INPUT naming code_verifier, keeping the status and the body", async () => {
    const res = await mapRejection(reply(400, { error_description: "invalid code_verifier" }));
    expect([res.status, await res.json()]).toEqual([400, { error_description: "invalid code_verifier", code: "BAD_INPUT", field: "code_verifier" }]);
  });

  it("rule 13: ORGANIZATION_NOT_FOUND and USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION are BAD_INPUT naming organizationId", async () => {
    for (const code of ["ORGANIZATION_NOT_FOUND", "USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION"]) {
      const res = await mapRejection(reply(403, { code }));
      expect([res.status, await res.json()]).toEqual([400, { code: "BAD_INPUT", field: "organizationId", message: code }]);
    }
  });

  it("rule 13: a ROLE_NOT_FOUND message is BAD_INPUT naming role", async () => {
    const res = await mapRejection(reply(400, { message: "ROLE_NOT_FOUND: boss" }));
    expect([res.status, await res.json()]).toEqual([400, { code: "BAD_INPUT", field: "role", message: "ROLE_NOT_FOUND: boss" }]);
  });

  it("rule 7: a 401 YOU_ARE_NOT_ALLOWED... becomes 403 with the same body; another 401 stays 401", async () => {
    const denied = await mapRejection(reply(401, { code: "YOU_ARE_NOT_ALLOWED_TO_DELETE" }));
    expect([denied.status, await denied.json()]).toEqual([403, { code: "YOU_ARE_NOT_ALLOWED_TO_DELETE" }]);
    expect((await mapRejection(reply(401, { code: "INVALID_EMAIL_OR_PASSWORD" }))).status).toBe(401);
    expect((await mapRejection(reply(403, { code: "YOU_ARE_NOT_ALLOWED_TO_DELETE" }))).status).toBe(403);
  });

  it("rule 13: statuses below 400 and from 500 up are never rewritten, whatever the body says", async () => {
    for (const status of [200, 302, 399, 500, 503]) {
      const res = await mapRejection(reply(status, { code: "ORGANIZATION_NOT_FOUND" }));
      expect([status, res.status, (await res.json()).code]).toEqual([status, status, "ORGANIZATION_NOT_FOUND"]);
    }
  });

  it("rule 13: 400 and 499 are rewritten, and a body that is not JSON passes through", async () => {
    for (const status of [400, 499]) expect((await mapRejection(reply(status, { code: "ORGANIZATION_NOT_FOUND" }))).status).toBe(400);
    const res = await mapRejection(new Response("oops", { status: 404 }));
    expect([res.status, await res.text()]).toEqual([404, "oops"]);
  });
});
