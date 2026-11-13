import { afterAll, beforeAll } from "vitest";
import { startHttp } from "./http/server.js";
import { proposalSuite } from "./proposed/proposals.js";
import { coldSuite } from "./suites/cold.js";
import { dbSuite } from "./suites/db.js";
import { gatedSuite } from "./suites/gated.js";
import { httpSuite } from "./suites/http.js";
import { out } from "./support/report.js";
import { type Ctx, scaleWorld } from "./support/world.js";

// The only seeding in this folder: one 125k-file world for every suite, built once. Setup failure throws, so no test can silently skip.
const ctx: Partial<Ctx> = {};
const get = (): Ctx => ctx as Ctx;
beforeAll(async () => {
  ctx.w = await scaleWorld();
  ctx.h = await startHttp(ctx.w.pool);
  out(`seeded ${JSON.stringify(ctx.w.counts)} in ${ctx.w.seedMs} ms`);
}, 300_000);
afterAll(async () => {
  await ctx.h?.stop();
  await ctx.w?.stop();
}, 300_000);

dbSuite(get);
coldSuite(get); // before httpSuite so bob's first /clusters request is truly the first
httpSuite(get);
gatedSuite(get);
proposalSuite(get); // last: it adds indexes to the shared world
