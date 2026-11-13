import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { startApp } from "../support/app.js";
import { skip } from "../support/db.js";

let app: Awaited<ReturnType<typeof startApp>>;
beforeAll(async () => {
  if (!skip)
    app = await startApp({
      page: {
        html: "<!doctype html><title>Mine</title><button>Continue with Google</button>",
        styleSrc: ["'sha256-abc'"],
        fontSrc: ["https://fonts.gstatic.com"],
      },
    });
});
afterAll(() => app?.close());

describe.skipIf(skip)("an app-supplied sign-in page", () => {
  test("is served at /sign-in, and its style and font sources join the policy", async () => {
    const res = await fetch(`${app.local}/sign-in`);
    expect(await res.text()).toContain("<title>Mine</title>");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("style-src 'self' 'sha256-abc'");
    expect(csp).toContain("font-src https://fonts.gstatic.com");
    expect(csp).toContain("default-src 'none'");
  });
});
