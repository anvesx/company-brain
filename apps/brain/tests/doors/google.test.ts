import { afterEach, describe, expect, it } from "vitest";
import { follow, googleConfig } from "../../../../features/identity/tests/support/replay/flow.js";
import { type Replay, startReplay } from "../../../../features/identity/tests/support/replay/server.js";
import { doorsFromEnv } from "../../src/doors/env.js";
import { Browser, bootBrain, type Env } from "../identity/boot.js";

// The user's complaint on 2026-11-07: "I don't see login with google". The identity feature had the button; the brain
// app never passed `google` into its config. These run the brain app itself, not identity's own test server.
let env: Env | undefined;
let replay: Replay | undefined;
afterEach(async () => {
  await env?.close();
  await replay?.close();
  [env, replay] = [undefined, undefined];
});

const GOOGLE_FORM = /<form method="post" action="\/sign-in\/google">/;

describe("Continue with Google on the brain app", () => {
  it("is absent when no Google credentials are configured (the default local start)", async () => {
    env = await bootBrain({}, doorsFromEnv({}, "brain-doors-test-secret-0123456789abcdef"));
    for (const page of ["/sign-in", "/sign-up"]) {
      const html = await (await fetch(`${env.base}${page}`)).text();
      expect(html).not.toContain("Continue with Google");
      expect(html).not.toMatch(GOOGLE_FORM);
    }
  });

  it("shows the button on sign-in and sign-up once credentials are set, and the click reaches the provider", async () => {
    replay = await startReplay({ oidc: true });
    env = await bootBrain({}, googleConfig(replay)); // the same shape doorsFromEnv builds, pointed at the replay provider
    for (const page of ["/sign-in", "/sign-up"]) {
      const html = await (await fetch(`${env.base}${page}`)).text();
      expect(html).toContain("Continue with Google");
      expect(html).toMatch(GOOGLE_FORM);
    }
    const browser = new Browser(env.base);
    const { at } = await follow(browser, await browser.call("/sign-in/google", { form: {} }), 1);
    expect(at.origin).toBe(new URL(replay.discoveryUrl).origin); // one redirect lands on the provider's authorize endpoint
    expect(at.searchParams.get("prompt")).toBe("select_account");
  });
});
