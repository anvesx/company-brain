/** Runs fn with env vars set (undefined deletes), then restores each exactly: absent stays absent. */
export function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const prior = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  const apply = (v: Record<string, string | undefined>): void => {
    for (const [k, x] of Object.entries(v)) {
      if (x === undefined) delete process.env[k];
      else process.env[k] = x;
    }
  };
  try {
    apply(vars);
    fn();
  } finally {
    apply(prior);
  }
}
