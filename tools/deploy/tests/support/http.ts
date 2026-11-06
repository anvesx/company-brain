import { createHmac } from "node:crypto";

/** A brain API token, `Bearer user:tenant:exp:hmac`, the shape apps/brain/src/gate/auth.ts verifies. Valid 10 minutes. */
export function bearer(secret: string, user: string, tenant: string): string {
  const exp = Math.floor(Date.now() / 1000) + 600;
  const sig = createHmac("sha256", secret).update(`${user}:${tenant}:${exp}`).digest("hex");
  return `Bearer ${user}:${tenant}:${exp}:${sig}`;
}

/** Poll until check() resolves true; a thrown or rejected check (server not up yet) counts as "not yet". */
export async function until(check: () => Promise<boolean>, ms: number): Promise<void> {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 250))) if (await check().catch(() => false)) return;
  throw new Error(`condition not met within ${ms} ms`);
}
