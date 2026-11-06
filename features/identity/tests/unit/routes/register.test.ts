import { describe, expect, it } from "vitest";
import { labelNativeClient } from "../../../src/routes/register.js";

const post = (body: unknown) => new Request("http://x/register", { method: "POST", body: JSON.stringify(body) });
const labelled = async (body: unknown) => ((await (await labelNativeClient(post(body))).json()) as { application_type?: string }).application_type;

describe("labelNativeClient (RFC 8252 loopback redirects)", () => {
  it("rule 5: every redirect on http loopback labels the client native, keeping the other fields", async () => {
    const body = { client_name: "c", redirect_uris: ["http://127.0.0.1:1/cb", "http://localhost:2/cb", "http://[::1]:3/cb"] };
    const res = await labelNativeClient(post(body));
    expect(await res.json()).toEqual({ ...body, application_type: "native" });
  });

  it("rule 5: one https or non-loopback redirect leaves the client unlabelled", async () => {
    expect(await labelled({ redirect_uris: ["http://127.0.0.1:1/cb", "https://app.example.com/cb"] })).toBeUndefined();
    expect(await labelled({ redirect_uris: ["https://127.0.0.1/cb"] })).toBeUndefined();
    expect(await labelled({ redirect_uris: ["http://app.example.com/cb"] })).toBeUndefined();
  });

  it("rule 5: empty, missing or non-list redirect_uris, and unparsable entries, stay unlabelled", async () => {
    for (const redirect_uris of [[], undefined, "http://127.0.0.1/cb", ["not a url"]]) expect(await labelled({ redirect_uris })).toBeUndefined();
  });

  it("rule 5: a client that already says what it is keeps its label", async () => {
    expect(await labelled({ application_type: "web", redirect_uris: ["http://127.0.0.1/cb"] })).toBe("web");
  });

  it("rule 5: a body that is not JSON is passed on untouched", async () => {
    const req = new Request("http://x/register", { method: "POST", body: "plain" });
    expect(await (await labelNativeClient(req)).text()).toBe("plain");
  });
});
