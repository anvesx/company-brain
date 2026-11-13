import { expect, it } from "vitest";
import { decide, type Target, type Viewer } from "../../src/index.js";

const viewer: Viewer = { tenant: "t", user: "u", aliases: ["u@example.test"], role: "member", zones: ["general"] };
const target: Target = {
  tenant: "t",
  id: "drive:file",
  owner: "owner",
  zone: "general",
  acl: [{ at: 1, allow: ["team-a", "u@example.test", "team-b"] }],
};

it("decides one million visible files in under five seconds", () => {
  const total = 1_000_000;
  const started = performance.now();
  let visible = 0;
  for (let i = 0; i < total; i++) if (decide(viewer, target).visible) visible++;
  const elapsed = performance.now() - started;
  expect(visible).toBe(total);
  expect(elapsed).toBeLessThan(5_000);
});
