import { describe, expect, test } from "vitest";
import { signInPage } from "../../src/login/page.js";

describe("the sign-in page", () => {
  const page = signInPage();
  test("is a document with one design-system Google button and no input", () => {
    expect(page.html.startsWith("<!doctype html>")).toBe(true);
    expect(page.html.match(/<button[^>]*class="btn btn-google"/g)).toHaveLength(1);
    expect(page.html).toContain("Continue with Google");
    expect(page.html).not.toMatch(/<input|<textarea|<select/i);
  });
  test("its one inline style block is allowed by hash", async () => {
    const { createHash } = await import("node:crypto");
    const blocks = [...page.html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? "");
    expect(blocks).toHaveLength(1);
    expect(page.styleSrc).toContain(
      `'sha256-${createHash("sha256")
        .update(blocks[0] ?? "")
        .digest("base64")}'`,
    );
  });
});
