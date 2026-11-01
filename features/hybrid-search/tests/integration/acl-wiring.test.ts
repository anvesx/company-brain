import type { Principal } from "@brain/core-types";
import { describe, expect, it } from "vitest";
import { allowClause } from "../../../acl-filter/src/index.js";
import { createSearchIndex } from "../../src/index.js";

const acl = { allowUsers: ["alice"], allowGroups: ["eng"], version: 1 };
const person = (id: string, tenantId = "t", groups: string[] = []): Principal => ({ id, tenantId, groups });

function build() {
  const index = createSearchIndex(":memory:", 2);
  index.add({ chunkId: "c1", docId: "d1", tenantId: "t", text: "needle", embedding: [1, 0], acl });
  return (p: Principal) => index.search({ text: "needle", embedding: [1, 0], limit: 5, acl: allowClause(p) }).map((h) => h.chunkId);
}

describe("allowClause wired into a real index", () => {
  it("denies a tenant member who is not on the ACL, on both retrieval paths", () => {
    const find = build();
    expect(find(person("bob"))).toEqual([]);
    expect(find(person("bob", "t", ["ops"]))).toEqual([]);
  });

  it("allows a listed user and a member of a listed group", () => {
    const find = build();
    expect(find(person("alice"))).toEqual(["c1"]);
    expect(find(person("bob", "t", ["eng"]))).toEqual(["c1"]);
  });

  it("denies a listed user from another tenant", () => {
    expect(build()(person("alice", "other"))).toEqual([]);
  });
});
