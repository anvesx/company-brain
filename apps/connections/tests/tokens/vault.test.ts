import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { createWithToken, openVault } from "../../src/tokens/open.js";
import { refreshAccount, tokenFor } from "../../src/tokens/refresh.js";
import { tempStore } from "../accounts/fixture.js";
import { seed } from "../http/fixture.js";
import { bootJobs } from "../jobs/fixture.js";
import { AUTH, databaseUrl, KEYS } from "../pg/db.js";

let h: Awaited<ReturnType<typeof bootJobs>>;
beforeAll(async () => {
  if (!skip) h = await bootJobs();
});
afterAll(() => h?.close());

describe.skipIf(skip)("vault-backed tokens", () => {
  it("rolls the account row back when the vault cannot store the token", async () => {
    const pool = new pg.Pool({ connectionString: databaseUrl() });
    const vault = await openVault(pool, KEYS, AUTH);
    await pool.end();
    const t = tempStore();
    await expect(
      createWithToken(
        { store: t.store, vault },
        { tenant: "t1", owner: "o", provider: "github", label: "x", kind: "pat", access: "private", dataZone: "company" },
        { accessToken: "ghp" },
      ),
    ).rejects.toThrow();
    expect(t.store.active()).toEqual([]);
    t.done();
  });
  it("lets several replicas open the vault at once", async () => {
    const pools = [0, 1, 2, 3].map(() => new pg.Pool({ connectionString: databaseUrl(), max: 2 }));
    const vaults = await Promise.all(pools.map((p) => openVault(p, KEYS, AUTH)));
    expect(vaults).toHaveLength(4);
    await Promise.all(pools.map((p) => p.end()));
  });
  it("returns the stored access token when it is not due, and nothing for an account with no vault row", async () => {
    const a = await seed(h.deps, {}, { accessToken: "tok", refreshToken: "rt", expiresAt: new Date(h.deps.now() * 1000 + 3_600_000) });
    expect(await tokenFor(h.deps, a)).toBe("tok");
    await h.deps.vault.remove(a.tenant, a.id);
    expect(await tokenFor(h.deps, a)).toBeUndefined();
  });
  it("does not refresh a personal access token or an oauth account with no client configured", async () => {
    const pat = await seed(h.deps);
    const oauth = await seed(h.deps, { kind: "oauth" }, { accessToken: "a", refreshToken: "r", expiresAt: new Date(0) });
    expect(await refreshAccount(h.deps, pat)).toBe("unsupported");
    expect(await refreshAccount(h.deps, oauth)).toBe("unsupported");
    expect(await tokenFor(h.deps, oauth)).toBe("a");
  });
});
