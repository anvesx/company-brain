import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, data, open } from "../support/client.js";
import { type BrainEnv, bootBrain } from "../support/server.js";
import { colleague, type Member, member } from "../support/users.js";
import { budget, seed } from "./seed.js";

// D3: a word in every title ("re", "repo", "report") used to sort and ACL-check ~100k matches per call.
// Ada reads teams 0-1, Eve reads teams 2-3, Zed reads nothing, so Zed's search is the worst case: no hit ever
// fills the page and the call must stop at the candidate cap (4,096) with `truncated`.
let env: BrainEnv;
let ada: Member;
let eve: Member;
let zed: Member;
beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
  eve = await colleague(env, ada, "Eve");
  zed = await colleague(env, ada, "Zed");
  await seed(env, { Ada: { member: ada, teams: [0, 1] }, Eve: { member: eve, teams: [2, 3] }, Zed: { member: zed, teams: [] } });
}, 600_000);
afterAll(async () => env?.close());

type Page = { nodes: { id: string }[]; next?: string; truncated?: boolean };
describe("common terms at 100k nodes", () => {
  it.each([["Ada"], ["Eve"], ["Zed"]])(
    "%s: report, re and repo stay under 50 ms at p99",
    async (who) => {
      const m = { Ada: ada, Eve: eve, Zed: zed }[who as "Ada"];
      const { client } = await open(env.url, m.token);
      const took: number[] = [];
      for (let i = 0; i < 90; i++) {
        const query = ["report", "re", "repo"][i % 3] as string;
        const t0 = performance.now();
        const page = await data<Page>(client, "brain.search", { query });
        took.push(performance.now() - t0);
        if (who === "Zed")
          expect(page).toMatchObject({ nodes: [], truncated: true }); // nothing readable: the cap ends the call
        else expect(page.nodes).toHaveLength(20);
      }
      budget(`brain.search report/re/repo for ${who}`, took, 50);
      await client.close();
    },
    120_000,
  );

  it("a cursor continues a truncated search", async () => {
    const { client } = await open(env.url, zed.token);
    const first = await data<Page>(client, "brain.search", { query: "report" });
    const second = await data<Page>(client, "brain.search", { query: "report", cursor: first.next });
    expect(Number(second.next)).toBeGreaterThan(Number(first.next));
    await client.close();
  });

  // Not a budget: brain.graph recomputes everything the caller can see on every page, so its cost follows the
  // visible set, not `limit`. The numbers are printed so the "known limits" in src/tools/README.md stay honest.
  it("brain.graph cost for Ada at limits 100, 5000 and 20000 (printed)", async () => {
    const { client } = await open(env.url, ada.token);
    for (const limit of [100, 5000, 20_000]) {
      const took: number[] = [];
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        const r = await call(client, "brain.graph", { limit });
        took.push(performance.now() - t0);
        expect(r.isError).toBeFalsy();
      }
      took.sort((a, b) => a - b);
      console.log(`brain.graph limit ${limit} for Ada: p50 ${took[1]?.toFixed(0)} ms, max ${took[2]?.toFixed(0)} ms`);
    }
    await client.close();
  }, 120_000);
});
