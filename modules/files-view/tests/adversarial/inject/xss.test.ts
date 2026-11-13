import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
const P = `"><script>alert(1)</script><img src=x onerror=alert(2)>`;
beforeAll(async () => {
  w = await boot();
  await w.file("x1", { title: P, owner: P, mime: P, source: "drive", props: { folder: P } });
  await w.cluster("cx", { title: P, why: `why ${P}` });
  await w.link("x1", "cx");
});
afterAll(() => w.close());
const safe = (html: string) => {
  expect(html).not.toContain("<script>alert");
  expect(html).not.toMatch(/<img[^>]+onerror/i);
  expect(html).not.toContain(P);
};

describe("html escaping", () => {
  it("escapes title, owner, mime, folder, cluster name and why on every screen", async () => {
    for (const p of ["/files", "/files/x1", "/clusters", "/clusters/cx"]) safe((await w.get(p, A)).body);
  });
  it("escapes echoed search text and filter values (reflected XSS)", async () => {
    for (const k of ["q", "source", "mime", "owner", "cluster", "from", "to"]) safe((await w.get(`/files?${k}=${encodeURIComponent(P)}`, A)).body);
  });
  it("escapes a hostile id in the 404 page and in links", async () => {
    safe((await w.get(`/files/${encodeURIComponent(P)}`, A)).body);
    safe((await w.get(`/clusters/${encodeURIComponent(P)}`, A)).body);
  });
  it("next-page link cursor is attribute-safe and javascript: titles are not live hrefs", async () => {
    await w.bulk(150, (i) => ({
      title: `javascript:alert(${i})`,
      props: { owner: "alice", zone: "company", mime: "a", size: "1", modified: "2026-01-01T00:00:00Z" },
    }));
    const body = (await w.get("/files?limit=100", A)).body;
    expect(body).not.toMatch(/href="javascript:/i);
    expect(body).toMatch(/href="[^"]*cursor=[A-Za-z0-9_%-]+/);
  });
  it("content type is html with charset and nosniff", async () => {
    const r = await w.get("/files", A);
    expect(r.headers.get("content-type")).toMatch(/text\/html.*utf-8/i);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
