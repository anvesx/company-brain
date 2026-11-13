/** What the provider says about a token itself, apart from what the token may read. */
export type Probe = "valid" | "rejected" | "unknown";

/**
 * The connectors map both 401 and 403 to FORBIDDEN, so after one the sync asks the provider whether the token is still good.
 * GitHub answers `GET /user` with 401 for a dead token and 200 for a live one, whatever the repo allows. Providers without a probe
 * report `rejected`, the safe reading: the account asks to be reconnected.
 */
export async function probeToken(provider: string, apiUrl: string | undefined, token: string): Promise<Probe> {
  if (provider !== "github") return "rejected";
  try {
    const r = await fetch(`${apiUrl ?? "https://api.github.com"}/user`, { headers: { authorization: `token ${token}` }, signal: AbortSignal.timeout(10_000) });
    return r.status === 401 ? "rejected" : r.ok ? "valid" : "unknown";
  } catch {
    return "unknown";
  }
}
