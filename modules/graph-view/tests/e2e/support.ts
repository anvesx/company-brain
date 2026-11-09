import { randomUUID } from "node:crypto";
import type { GraphStore } from "@anvesx/graph-store";
import { type Browser, chromium, type Page } from "@playwright/test";
import type { GraphViewPage } from "../../src/index.js";
import { boot, type Env, whoIs } from "../support/server.js";
import { edge, node, openLongStore, write } from "../support/store.js";

// Same switch and browser lookup as identity's e2e suite (features/identity/tests/e2e/support.ts).
export const RUN = process.env["PLAYWRIGHT"] === "1";
const PASSWORD = "violet-anchor-quartz-1987";

export const shot = (page: Page, name: string) => page.screenshot({ path: new URL(`./shots/${name}.png`, import.meta.url).pathname });

/** A real identity server with the graph view, over a graph-store file, plus Chromium. */
export async function startE2e(): Promise<{ env: Env; store: GraphStore; browser: Browser; stop: () => Promise<void> }> {
  const { store, drop } = openLongStore();
  const env = await boot(store);
  const executablePath = process.env["E2E_CHROMIUM_PATH"];
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const stop = async () => {
    await browser.close();
    await env.close();
    drop();
  };
  return { env, store, browser, stop };
}

/** Signs a new person up through identity's sign-up page, then reads their tenant and user from the session. */
export async function signUpThroughPage(env: Env, page: Page) {
  await page.goto(`${env.base}/sign-up`);
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(`e2e-${randomUUID()}@example.com`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign up/i }).click();
  await page.waitForLoadState("networkidle");
  const cookie = (await page.context().cookies(env.base)).map((c) => `${c.name}=${c.value}`).join("; ");
  return whoIs(env, cookie);
}

/**
 * A company of 4,323 nodes the person can see in one page (default limit 5,000, so no paging), above the
 * 2,000 at which node drag turns off: the person, 2 teams, 4,000 documents over 4 connectors,
 * 20 projects and 300 colleagues. Document d0000 belongs to project p0, so the panel has a known neighbour.
 */
export function seedCompany(store: GraphStore, tenant: string, user: string): void {
  const docs = Array.from({ length: 4_000 }, (_, i) => `d${String(i).padStart(4, "0")}`);
  const sources = ["gdrive", "notion", "github", "slack"];
  write(
    store,
    1,
    [
      node(tenant, user, "person", "slack", { title: "Ada Lovelace" }),
      ...["t0", "t1"].map((id) => node(tenant, id, "team", "slack")),
      ...docs.map((id, i) => node(tenant, id, "document", sources[i % 4] as string)),
      ...Array.from({ length: 20 }, (_, i) => node(tenant, `p${i}`, "project", "linear")),
      ...Array.from({ length: 300 }, (_, i) => node(tenant, `c${i}`, "person", "slack")),
    ],
    [
      edge(tenant, user, "t0", "member-of"),
      edge(tenant, user, "t1", "member-of"),
      ...docs.map((id, i) => edge(tenant, i % 3 === 0 ? user : `t${i % 2}`, id, "can-read")),
      ...docs.map((id, i) => edge(tenant, id, `p${i % 20}`, "belongs-to")),
      ...Array.from({ length: 300 }, (_, i) => edge(tenant, `c${i}`, docs[i * 13] as string, "can-read")),
    ],
  );
}

/** Signs up, seeds the company, opens /graph and times warmup-to-stop (rule 6); `logs` holds the console and page errors. */
export async function openGraph(env: Env, store: GraphStore, page: Page): Promise<{ json: GraphViewPage; ms: number; logs: string[] }> {
  const logs: string[] = [];
  page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
  const who = await signUpThroughPage(env, page);
  seedCompany(store, who.tenant, who.user);
  const json = (await (await page.context().request.get(`${env.base}/v1/graph`)).json()) as GraphViewPage;
  const start = Date.now();
  await page.goto(`${env.base}/graph`);
  await page.locator('#graph[data-engine="stopped"]').waitFor({ timeout: 15_000 });
  return { json, ms: Date.now() - start, logs };
}
