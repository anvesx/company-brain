import { describe, expect, it } from "vitest";
import { CSP, secure, toNode, toPage, toQuery, toRow } from "../../../src/http/models.js";

const gateRow = {
  id: "f1",
  title: "T",
  source: "notion",
  props: { owner: "a", mime: "x/y", size: "9", modified: "2026-01-01T00:00:00Z", folder: "/f" },
  paths: [
    {
      id: "l",
      type: "topic",
      why: "w",
      chain: [
        { id: "r", title: "R", why: "" },
        { id: "l", title: "L", why: "w" },
      ],
    },
  ],
};
describe("view models", () => {
  it("toRow maps gate props and chains into the view model", () => {
    expect(toRow(gateRow)).toMatchObject({
      id: "f1",
      owner: "a",
      mime: "x/y",
      size: 9,
      folder: "/f",
      clusters: [
        {
          type: "topic",
          why: "w",
          segments: [
            { id: "r", name: "R" },
            { id: "l", name: "L" },
          ],
        },
      ],
    });
  });
  it("toRow tolerates missing props", () => {
    const r = toRow({ ...gateRow, props: {}, paths: [] });
    expect([r.owner, r.mime, r.modified, r.folder, Number.isNaN(r.size)]).toEqual(["", "", "", undefined, true]);
  });
  it("toPage lists filter choices only from rows on the page plus the current selection", () => {
    const p = toPage({ rows: [gateRow, { ...gateRow, id: "f2", source: "slack", props: { ...gateRow.props, mime: "a/b" } }], next: "n" }, { source: "gdrive" });
    expect([p.sources, p.mimes, p.nextCursor]).toEqual([["gdrive", "notion", "slack"], ["a/b", "x/y"], "n"]);
  });
  it("toQuery drops the cursor so sort links restart", () => expect(toQuery({ q: "a", cursor: "c" }).cursor).toBeUndefined());
  it("toNode maps a flat cluster and a nested tree", () => {
    const flat = toNode({ id: "a", title: "A", type: "place", why: "w", parent: "", count: 2, capped: false, subtree: ["a"] });
    expect(flat).toEqual({ id: "a", name: "A", type: "place", why: "w", count: 2, children: [] });
    expect(toNode({ ...flat, title: "A", children: [{ ...flat, id: "b", title: "B", children: [] }] } as never).children[0]?.id).toBe("b");
  });
});

describe("security headers", () => {
  it("sets CSP, no-store, nosniff and no referrer", () => {
    const h: Record<string, string> = {};
    secure((k, v) => {
      h[k] = v;
    });
    expect(Object.keys(h).sort()).toEqual(["cache-control", "content-security-policy", "referrer-policy", "x-content-type-options"]);
    expect(h["cache-control"]).toBe("no-store");
  });
  it("the CSP allows no script and pins the two inline sheets by hash", () => {
    expect(CSP).toMatch(/^default-src 'none'/);
    expect(CSP).not.toMatch(/script-src|unsafe-|\*/);
    expect(CSP.match(/'sha256-[A-Za-z0-9+/=]+'/g)).toHaveLength(2);
  });
});
