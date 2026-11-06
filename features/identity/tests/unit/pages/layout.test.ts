import { describe, expect, it } from "vitest";
import { esc, field, hidden, page } from "../../../src/pages/layout.js";

describe("page shell", () => {
  it("rule 12: escapes the five characters that can open markup, as numeric references", () => {
    // & is 38, < is 60, > is 62, " is 34, ' is 39.
    expect(esc(`<a href="x">Tom & 'Jerry'</a>`)).toBe("&#60;a href=&#34;x&#34;&#62;Tom &#38; &#39;Jerry&#39;&#60;/a&#62;");
  });

  it("rule 12: a page with no script ships none, and its title is escaped in <title> and <h1>", () => {
    const html = page("A <b>", "<p>body</p>");
    expect(html).toContain("<title>A &#60;b&#62;</title>");
    expect(html).toContain("<h1>A &#60;b&#62;</h1>\n<p>body</p>\n</main></body></html>");
    expect(html).not.toContain("<script");
    expect(html.startsWith('<!doctype html>\n<html lang="en">')).toBe(true);
  });

  it("rule 12: a page given a script puts it after the main element", () => {
    expect(page("T", "x", "go()")).toContain("</main><script>go()</script></body></html>");
  });

  it("rule 12: a labelled field wraps its input, with the type and autocomplete hint", () => {
    expect(field("E & mail", "email", "email", "username")).toBe(
      '<label>E &#38; mail<input name="email" type="email" autocomplete="username" required></label>',
    );
  });

  it("rule 12: hidden inputs sit side by side and escape their values", () => {
    expect(hidden({ csrf: "t", oauth_query: 'a="1"' })).toBe(
      '<input type="hidden" name="csrf" value="t"><input type="hidden" name="oauth_query" value="a=&#34;1&#34;">',
    );
    expect(hidden({})).toBe("");
  });
});
