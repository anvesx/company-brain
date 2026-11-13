/**
 * Form and data components, rendered on the server.
 */

import { jsx } from "hono/jsx";
import { describe, expect, it } from "vitest";
import { Button, Chip, Flash, FormField, ProviderButton, Table, TableCell, TableHeader, TableRow, Tile, TileHead, TileMark } from "../src/components/index.ts";

const r = (el: unknown) => String(el);
describe("Button", () => {
  it("defaults to type=button with class btn", () => {
    expect(r(jsx(Button, {}, "Go"))).toBe('<button class="btn" type="button">Go</button>');
  });
  it("applies every variant class", () => {
    const b = r(jsx(Button, { secondary: true, danger: true, link: true }, "x"));
    expect(b).toContain("btn btn-2 btn-danger btn-link");
  });
  it("supports submit and disabled", () => {
    const b = r(jsx(Button, { type: "submit", disabled: true }, "x"));
    expect(b).toContain('type="submit"');
    expect(b).toContain("disabled");
  });
});

describe("ProviderButton", () => {
  it("renders the Google button with a hidden icon", () => {
    const b = r(jsx(ProviderButton, {}));
    expect(b).toContain("Continue with Google");
    expect(b).toContain('aria-hidden="true"');
    expect(b).toContain('type="submit"');
    expect(r(jsx(ProviderButton, { disabled: true }))).toContain("disabled");
  });
});

describe("FormField", () => {
  it("links label to input", () => {
    const f = r(jsx(FormField, { label: "Email", name: "email", type: "email" }));
    expect(f).toContain('<label for="email">Email</label>');
    expect(f).toContain('id="email"');
    expect(f).toContain('type="email"');
    expect(f).not.toContain("aria-invalid");
  });
  it("wires the error through aria-describedby", () => {
    const f = r(jsx(FormField, { label: "E", name: "e", error: "Bad", required: true }));
    expect(f).toContain('aria-invalid="true"');
    expect(f).toContain('aria-describedby="e-error"');
    expect(f).toContain('<p id="e-error" class="field-error">Bad</p>');
    expect(f).toContain("required");
  });
});
describe("Chip and Flash", () => {
  it("Chip has no trailing space without a variant", () => {
    expect(r(jsx(Chip, {}, "A"))).toBe('<span class="chip">A</span>');
    expect(r(jsx(Chip, { variant: "warn" }, "A"))).toContain('class="chip warn"');
  });
  it("Flash announces errors as alerts and success as status", () => {
    expect(r(jsx(Flash, {}, "ok"))).toBe('<div class="flash" role="status">ok</div>');
    expect(r(jsx(Flash, { bad: true }, "no"))).toContain('class="flash bad" role="alert"');
  });
});

describe("Tile and Table", () => {
  it("Tile composes modifiers on a post form", () => {
    const t = r(jsx(Tile, { needsAuth: true, off: true, action: "/c" }, "x"));
    expect(t).toContain('class="tile needs-auth off"');
    expect(t).toContain('action="/c" method="post"');
    expect(r(jsx(Tile, {}, "x"))).toContain('class="tile"');
  });
  it("TileHead and TileMark", () => {
    expect(r(jsx(TileHead, {}, "x"))).toContain("tile-head");
    expect(r(jsx(TileMark, {}, "x"))).toContain("tile-mark");
  });
  it("Table uses scoped headers", () => {
    const row = jsx(TableRow, {}, jsx(TableHeader, {}, "N"), jsx(TableHeader, { scope: "row" }, "R"));
    const t = r(jsx(Table, {}, row, jsx(TableRow, {}, jsx(TableCell, {}, "c"))));
    expect(t).toContain('<th scope="col">N</th>');
    expect(t).toContain('<th scope="row">R</th>');
    expect(t).toContain("<td>c</td>");
  });
});
