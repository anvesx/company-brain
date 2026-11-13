let me = { user: "", tenant: "" };

/** The signed-in user and tenant, as `/v1/me` reported them. */
export const who = () => me;

/** Ask who the session cookie belongs to. A browser with no session is sent to the Google sign-in page. */
export async function signedIn() {
  const r = await call("GET", "/v1/me");
  if (r.ok) me = r.data;
  return r.ok;
}

/** Sign out of the session, then back to the sign-in page. */
export async function signOut() {
  await fetch("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => null);
  location.assign("/sign-in");
}

/** One call to the API with the session cookie. Never throws; read `ok`, `data` and `error`. A 401 means the session ended, so the browser goes to the sign-in page. */
export async function call(method, path, body) {
  const headers = body ? { "content-type": "application/json" } : {};
  try {
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 401) location.assign("/sign-in");
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data, error: data?.error ?? `request failed (${res.status})` };
  } catch {
    return { ok: false, status: 0, data: null, error: "could not reach the server" };
  }
}

/** What this tenant can connect, from the server's catalog, as `[id, name]` pairs for a select. Empty when the call fails. */
export async function catalog() {
  const r = await call("GET", "/v1/catalog");
  return r.ok ? r.data.providers : [];
}
