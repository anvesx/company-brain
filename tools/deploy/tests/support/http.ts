/** Poll until check() resolves true; a thrown or rejected check (server not up yet) counts as "not yet". */
export async function until(check: () => Promise<boolean>, ms: number): Promise<void> {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 250))) if (await check().catch(() => false)) return;
  throw new Error(`condition not met within ${ms} ms`);
}
