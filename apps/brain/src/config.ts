import { createCursorStore } from "@brain/change-cursor";
import { createFakeConnector, type FakeDoc } from "@brain/connector-kit";
import type { Principal } from "@brain/core-types";
import type { BrainDeps } from "./types.js";

type Env = Record<string, string | undefined>;
export type BrainEnv = { port: number; auditDbPath: string; anchorPath: string; demo: boolean };

export function readEnv(env: Env): BrainEnv {
  const raw = env.BRAIN_PORT ?? "3000";
  const port = Number(raw);
  if (!/^\d{1,5}$/.test(raw) || port > 65535) throw new Error(`invalid BRAIN_PORT: ${raw}`);
  return {
    port,
    auditDbPath: env.BRAIN_AUDIT_DB ?? "brain-audit.db",
    anchorPath: env.BRAIN_ANCHOR ?? "brain-anchors.log",
    demo: env.BRAIN_DEMO === "1",
  };
}

/** Toy embedding for the demo only: text length and a constant, so any two texts share a direction. */
const embedText = (text: string): number[] => [text.length, 1];

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

/** Everything except the file paths and transport: an in-memory connector bound to the demo tenant and toy embeddings. */
export function demoDeps(): Omit<BrainDeps, "auditKey" | "auditDbPath" | "anchorPath" | "transport" | "port"> {
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
