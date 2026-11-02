const KEY = "connections.bearer";

export const token = () => sessionStorage.getItem(KEY);
export const setToken = (t) => (t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY));

/** The signed-in user and tenant, read from the `user:tenant:exp:hmac` bearer. */
export const who = () => {
  const [user, tenant] = (token() ?? "").split(":");
  return { user, tenant };
};

/** One call to the API with the bearer. Never throws; read `ok`, `data` and `error`. */
export async function call(method, path, body) {
  const headers = { authorization: `Bearer ${token()}` };
  if (body) headers["content-type"] = "application/json";
  try {
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
