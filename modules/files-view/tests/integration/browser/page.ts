import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { type Browser, type BrowserContext, chromium } from "@playwright/test";
import { boot, type Env } from "../support/app.js";
import type { Claims } from "../support/oidc.js";
import { bulk, seedWorld } from "../support/world.js";

export const SHOTS = join(import.meta.dirname, "../../../todo/shots"); // evidence screenshots, committed
export const ALICE: Claims = { tenant: "t1", user: "alice" };
export type Scheme = "light" | "dark";

/** Real server (Postgres, JWKS, Hono) plus a real headless Chromium; every page request carries a real bearer JWT. */
export async function launch() {
  const env: Env = await boot();
  await seedWorld(env.store);
  await bulk(env.pool, "e", "e", 5, (i) => ({
    title: `E ${i}`,
    props: { owner: "alice", zone: "company", mime: "text/plain", size: "1", modified: "2026-01-01T00:00:00Z" },
  }));
  const browser: Browser = await chromium.launch();
  const token = await env.oidc.token(ALICE);
  const open = async (scheme: Scheme, authed = true, width = 1280): Promise<BrowserContext> =>
    browser.newContext({
      colorScheme: scheme,
      viewport: { width, height: 800 },
      ...(authed && { extraHTTPHeaders: { authorization: `Bearer ${token}` } }),
    });
  const shot = async (ctx: BrowserContext, path: string, name: string) => {
    mkdirSync(SHOTS, { recursive: true });
    const page = await ctx.newPage();
    await page.goto(env.base + path);
    await page.screenshot({ path: join(SHOTS, name), fullPage: true });
    await page.close();
  };
  const stop = async () => {
    await browser.close();
    await env.stop();
  };
  return { env, open, shot, stop };
}
export type Rig = Awaited<ReturnType<typeof launch>>;
