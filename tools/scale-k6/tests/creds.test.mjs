import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { mint, SECRET } from "../src/creds.mjs";

test("mint signs user:tenant:exp with the shared secret and expires after the ttl", () => {
  const [user, tenant, exp, sig] = mint("root", "t1", 60, 1_000_000).split(":");
  assert.deepEqual([user, tenant, exp], ["root", "t1", "1060"]);
  assert.equal(sig, createHmac("sha256", SECRET).update("root:t1:1060").digest("hex"));
});
