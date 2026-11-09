import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { data, open } from "../support/client.js";
import { type BrainEnv, bootBrain } from "../support/server.js";
import { type Member, member } from "../support/users.js";
import { budget, seed, WORDS } from "./seed.js";

// Rule 12: brain.search p99 under 50 ms at 100k nodes, measured end to end through the real SDK client.
// Ada is in 2 teams, so she reads 10% of the documents.
let env: BrainEnv;
let ada: Member;
beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
  await seed(env, { Ada: { member: ada, teams: [0, 1] } });
}, 600_000);
afterAll(async () => env?.close());

describe("at 100k nodes", () => {
  it("brain.search p99 stays under 50 ms over 200 mixed queries", async () => {
    const { client } = await open(env.url, ada.token);
    // Common words, numbers that hit one document, and words that hit nothing (a full miss is the worst case).
    const queries = Array.from({ length: 200 }, (_, q) => (q % 10 === 9 ? `zulu${q}` : q % 3 === 0 ? `report ${q * 97}` : WORDS[q % 16]));
    await data(client, "brain.search", { query: "alpha" });
    const took: number[] = [];
    let hits = 0;
    for (const query of queries) {
      const t0 = performance.now();
      const { nodes } = await data<{ nodes: { id: string }[] }>(client, "brain.search", { query });
      took.push(performance.now() - t0);
      hits += nodes.length;
    }
    expect(hits).toBeGreaterThan(0);
    budget("brain.search mixed queries at 100k nodes", took, 50);
    await client.close();
  }, 120_000);

  it("tools/list answers in under 5 ms at the median", async () => {
    const { client } = await open(env.url, ada.token);
    const took: number[] = [];
    for (let i = 0; i < 100; i++) {
      const t0 = performance.now();
      await client.listTools();
      took.push(performance.now() - t0);
    }
    budget("tools/list", took, 5, 50);
    await client.close();
  });
});
