/**
 * Layout and typography components, rendered on the server.
 */

import { jsx } from "hono/jsx";
import { describe, expect, it } from "vitest";
import { Document, Eyebrow, Heading, Link, Main, Paragraph, SkipLink } from "../src/components/index.ts";

const r = (el: unknown) => String(el);

describe("Document", () => {
  const page = r(jsx(Document, { title: "T", description: "D" }, "Hi"));
  it("is a complete html page with lang, viewport and title", () => {
    expect(page).toContain('<html lang="en">');
    expect(page).toContain('name="viewport"');
    expect(page).toContain("<title>T</title>");
    expect(page).toContain('content="D"');
  });
  it("inlines unescaped CSS with both themes and reduced motion", () => {
    expect(page).toContain("--paper:#FFFFFF");
    expect(page).toContain("prefers-color-scheme:dark");
    expect(page).toContain("prefers-reduced-motion:reduce");
    expect(page).toContain("'Inter Tight'");
  });
  it("preconnects to the font hosts", () => {
    expect(page).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
  });
  it("omits description and graph class by default", () => {
    const bare = r(jsx(Document, { title: "T" }, "Hi"));
    expect(bare).not.toContain('name="description"');
    expect(bare).not.toContain('class="graph"');
  });
  it("applies the graph class and extra head in dark mode", () => {
    const head = jsx("meta", { name: "x", content: "y" });
    const g = r(jsx(Document, { title: "G", dark: true, head }, "C"));
    expect(g).toContain('<body class="graph">');
    expect(g).toContain('name="x"');
  });
});

describe("Main and SkipLink", () => {
  it("Main has the skip target id", () => {
    expect(r(jsx(Main, {}, "x"))).toBe('<main id="main">x</main>');
    expect(r(jsx(Main, { wide: true }, "x"))).toContain('class="wide"');
  });
  it("SkipLink points at the main id", () => {
    expect(r(jsx(SkipLink, {}))).toContain('href="#main"');
  });
});

describe("typography", () => {
  it("Heading renders h1 by default, h2 and h3 by level", () => {
    expect(r(jsx(Heading, {}, "A"))).toBe("<h1>A</h1>");
    expect(r(jsx(Heading, { level: 2 }, "A"))).toBe("<h2>A</h2>");
    expect(r(jsx(Heading, { level: 3 }, "A"))).toBe("<h3>A</h3>");
  });
  it("Heading adds an accent only on h1", () => {
    expect(r(jsx(Heading, { accent: "B" }, "A"))).toBe("<h1>A <em>B</em></h1>");
    expect(r(jsx(Heading, { level: 2, accent: "B" }, "A"))).toBe("<h2>A</h2>");
  });
  it("Paragraph, Eyebrow and Link", () => {
    expect(r(jsx(Paragraph, {}, "p"))).toBe("<p>p</p>");
    expect(r(jsx(Eyebrow, {}, "e"))).toBe('<small class="eyebrow">e</small>');
    expect(r(jsx(Link, { href: "/a" }, "l"))).toBe('<a href="/a">l</a>');
  });
  it("escapes user text", () => {
    expect(r(jsx(Paragraph, {}, "<script>"))).toBe("<p>&lt;script&gt;</p>");
  });
});
