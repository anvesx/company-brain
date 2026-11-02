import { createCursorStore } from "@brain/change-cursor";
import { createFakeConnector, type FakeDoc } from "@brain/connector-kit";
import type { Principal } from "@brain/core-types";
import type { BrainDeps } from "../types.js";

/** Toy embedding for the demo only: text length and a constant, so any two texts share a direction. */
export const embedText = (text: string): number[] => [text.length, 1];

const demoDoc = (address: string, text: string): FakeDoc => ({
  address,
  title: address,
  version: "v1",
  acl: { allowUsers: ["alice"], allowGroups: [], version: 1 },
  zone: "team",
  updatedAt: "2026-11-01T00:00:00.000Z",
  text,
});

/** The one tenant the demo connector belongs to. */
export const DEMO_TENANT = "acme";
const BEARER = /^Bearer ([^:]+):(.+)$/;

export type DemoDeps = Omit<BrainDeps, "auditKey" | "auditDbPath" | "anchorPath" | "transport" | "port" | "dataDir" | "logger">;

/** Unsigned `user:tenant` tokens: demo only (BRAIN_DEMO=1, loopback, no secret). An in-memory connector bound to the demo tenant and toy embeddings. */
export function demoDeps(): DemoDeps {
  const connector = createFakeConnector("demo", [demoDoc("welcome", "Welcome to the Devx Brain demo."), demoDoc("faq", "Ask the brain a question.")]);
  return {
    connectorFor: (tenantId) => (tenantId === DEMO_TENANT ? connector : undefined),
    tokenFor: (tenantId) => (tenantId === DEMO_TENANT ? "demo" : undefined),
    cursors: createCursorStore(":memory:", Date.now),
    clock: Date.now,
    embed: async (texts) => texts.map(embedText),
    embedQuery: async (text) => embedText(text),
    fetchText: async (p) => (await connector.fetch(p.address, { token: "demo" })).text,
    principalFor(extra): Principal {
      const headers = (extra as { requestInfo?: { headers?: Record<string, string | undefined> } }).requestInfo?.headers;
      const match = BEARER.exec(headers?.authorization ?? "");
      if (!match) throw new Error("unauthenticated");
      return { id: match[1] as string, tenantId: match[2] as string, groups: [] };
    },
  };
}
