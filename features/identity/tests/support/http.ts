import { IdentityError } from "../../src/index.js";

type Init = { method?: string; json?: unknown; form?: Record<string, string>; origin?: string | null };

/** A cookie-keeping HTTP client that sends Origin on every write, as a browser does. */
export class Browser {
  readonly jar = new Map<string, string>();
  constructor(readonly base: string) {}

  cookie(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  headers(): Headers {
    return new Headers(this.jar.size > 0 ? { cookie: this.cookie() } : {});
  }

  async call(path: string, init: Init = {}): Promise<Response> {
    const method = init.method ?? (init.json !== undefined || init.form ? "POST" : "GET");
    const headers = this.headers();
    const origin = init.origin === undefined ? this.base : init.origin;
    if (method !== "GET" && origin !== null) headers.set("origin", origin);
    let body: string | null = null;
    if (init.json !== undefined) [body] = [JSON.stringify(init.json), headers.set("content-type", "application/json")];
    if (init.form) [body] = [new URLSearchParams(init.form).toString(), headers.set("content-type", "application/x-www-form-urlencoded")];
    const res = await fetch(new URL(path, this.base), { method, headers, body, redirect: "manual" });
    for (const line of res.headers.getSetCookie()) this.keep(line);
    return res;
  }

  private keep(line: string): void {
    const pair = line.split(";")[0] ?? "";
    const at = pair.indexOf("=");
    const [name, value] = [pair.slice(0, at), pair.slice(at + 1)];
    if (value === "" || /max-age=0\b/i.test(line)) this.jar.delete(name);
    else this.jar.set(name, value);
  }
}

/** Long, unusual and not in any breached list. */
export const PASSWORD = "violet-anchor-quartz-1987";

export type Person = { browser: Browser; name: string; email: string; userId: string };

export const json = async <T>(res: Response): Promise<T> => (await res.json()) as T;

export async function signUp(env: { base: string }, name: string, email = `${name.toLowerCase()}@example.com`): Promise<Person> {
  const browser = new Browser(env.base);
  const res = await browser.call("/api/auth/sign-up/email", { json: { name, email, password: PASSWORD } });
  if (!res.ok) throw new Error(`sign-up failed ${res.status}: ${await res.text()}`);
  const { user } = await json<{ user: { id: string } }>(res);
  return { browser, name, email, userId: user.id };
}

export const signIn = (browser: Browser, email: string, password: string): Promise<Response> =>
  browser.call("/api/auth/sign-in/email", { json: { email, password } });

/** Awaits a promise that must reject with an IdentityError and returns that error. */
export async function failure(promise: Promise<unknown>): Promise<IdentityError> {
  const outcome = await promise.then(
    () => new Error("expected an IdentityError, got a value"),
    (error: unknown) => error,
  );
  if (outcome instanceof IdentityError) return outcome;
  throw outcome;
}
