import { describe, expect, it } from "vitest";
import { childrenSql, membersSql, subtreeSql } from "../../../src/db/clusters.js";
import { encode } from "../../../src/db/cursor.js";
import { cursorOf, listSql, orderOf } from "../../../src/db/list.js";

const base = { sort: "modified", dir: "desc", limit: 25 } as const;
describe("listSql", () => {
  it("is tenant-scoped, current-rows-only and parameterised", () => {
    const { sql, args } = listSql("t1", ["alice"], { ...base, q: "x'; DROP TABLE nodes;--", owner: "o" }, 26);
    expect(args[0]).toBe("t1");
    expect(sql).toMatch(/n\.tenant = \$1.*n\.valid_to IS NULL/);
    expect(sql).not.toContain("DROP TABLE");
    expect(args).toContain("%x'; DROP TABLE nodes;--%");
    expect(args.at(-1)).toBe(26);
    expect(sql).not.toMatch(/OFFSET/i);
  });
  it("escapes LIKE wildcards in the search text", () => expect(listSql("t", ["a"], { ...base, q: "100%_\\" }, 1).args).toContain("%100\\%\\_\\\\%"));
  it.each([
    ["modified", "desc", "<"],
    ["title", "asc", ">"],
    ["size", "asc", ">"],
  ] as const)("keyset condition for %s %s uses a row comparison with %s", (sort, dir, op) => {
    const { sql, args } = listSql("t", ["a"], { sort, dir, limit: 5 }, 6, { o: `${sort}:${dir}`, k: "7", i: "z" });
    expect(sql).toContain(`, n.id) ${op} (`);
    expect(args).toEqual(expect.arrayContaining(["7", "z"]));
    expect(sql).toMatch(new RegExp(`ORDER BY .* ${dir.toUpperCase()}, n\\.id ${dir.toUpperCase()}`));
  });
  it("sorts and ranges modified as a bigint instant, and folds non-ASCII search with ICU", () => {
    const { sql, args } = listSql("t", ["a"], { ...base, q: "Élan", from: "2026-01-01T00:00:00.000Z" }, 1, { o: "modified:desc", k: "-5", i: "z" });
    expect(sql).toContain("COALESCE(fv_ts(n.props, 'modified'), 0)");
    expect(sql).toContain('lower(n.title COLLATE "und-x-icu")');
    expect(args).toEqual(expect.arrayContaining([Date.parse("2026-01-01T00:00:00.000Z"), "-5"]));
    expect(sql).toMatch(/\$\d+::bigint, \$\d+::text\)/);
  });
  it("adds each filter only when given", () => {
    const plain = listSql("t", ["a"], base, 1).sql;
    for (const f of [{ source: "s" }, { mime: "m" }, { from: "2026-01-01T00:00:00.000Z" }, { to: "2026-02-01T00:00:00.000Z" }, { clusters: ["c"] }])
      expect(listSql("t", ["a"], { ...base, ...f }, 1).sql.length).toBeGreaterThan(plain.length);
  });
  it("cursorOf decodes only a cursor for the same order", () => {
    expect(cursorOf(base)).toBeUndefined();
    const raw = encode({ o: orderOf(base), k: "5", i: "i" });
    expect(cursorOf({ ...base, cursor: raw })?.i).toBe("i");
    expect(() => cursorOf({ ...base, dir: "asc", cursor: raw })).toThrow();
  });
});

describe("cluster SQL", () => {
  it("every builder is tenant-first, current-only and takes values as parameters", () => {
    for (const q of [childrenSql("t", "p", 5, "x"), subtreeSql("t", ["r"]), membersSql("t", ["c"], ["alice"], 500)]) {
      expect(q.args[0]).toBe("t");
      expect(q.sql).toContain("valid_to IS NULL");
      expect(q.sql).not.toMatch(/OFFSET/i);
    }
    expect(childrenSql("t", "p", 5).args).toEqual(["t", "p", "", 5]);
  });
});
