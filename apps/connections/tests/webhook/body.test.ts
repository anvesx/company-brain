import { describe, expect, it } from "vitest";
import { readCapped } from "../../src/webhook/body.js";

const post = (body: BodyInit | null) => new Request("http://x/", { method: "POST", body, duplex: "half" } as RequestInit);

describe("readCapped", () => {
  it("reads a body under the cap, and an empty one as an empty string", async () => {
    expect(await readCapped(post("hello"), 10)).toBe("hello");
    expect(await readCapped(post(null), 10)).toBe("");
  });
  it("gives up on a streamed body that passes the cap, even with no content-length", async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode("12345"));
        c.enqueue(new TextEncoder().encode("67890"));
        c.close();
      },
    });
    expect(await readCapped(post(stream), 8)).toBeUndefined();
  });
});
