/** The GraphError code a promise rejects with, or undefined when it resolves. A sync throw counts as a failure. */
export async function codeOf(run: () => Promise<unknown>): Promise<string | undefined> {
  let p: Promise<unknown>;
  try {
    p = run();
  } catch (e) {
    // The async contract rejects; it never throws synchronously. Surface that as its own code so tests catch it.
    return `SYNC_THROW:${(e as { code?: string }).code}`;
  }
  try {
    await p;
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
}

/** Waits until `check` is true, polling every 20 ms, or fails after `ms`. */
export async function until(check: () => Promise<boolean>, ms = 5_000): Promise<void> {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw new Error(`condition not met within ${ms} ms`);
    await new Promise((ok) => setTimeout(ok, 20));
  }
}
