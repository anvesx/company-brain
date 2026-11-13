import { describe, expect, test } from "vitest";
import { signInPage } from "../../src/login/page.js";

describe("the sign-in page", () => {
  const page = signInPage();
  const html = page.html();
  test("is a document with one design-system Google button and no input", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.match(/<button[^>]*class="btn btn-google"/g)).toHaveLength(1);
    expect(html).toContain("Continue with Google");
    expect(html).not.toMatch(/<input|<textarea|<select/i);
  });
  test("its one inline style block is allowed by hash", async () => {
    const { createHash } = await import("node:crypto");
    const blocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? "");
    expect(blocks).toHaveLength(1);
    expect(page.styleSrc).toContain(
      `'sha256-${createHash("sha256")
        .update(blocks[0] ?? "")
        .digest("base64")}'`,
    );
  });
  test("shows a short escaped notice only when one is given", () => {
    expect(html).not.toContain('role="alert"');
    expect(page.html("a <b> note")).toContain('<p role="alert">a &lt;b&gt; note</p>');
  });
});
