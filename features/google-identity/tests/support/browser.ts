/** A cookie jar plus redirect follower: just enough browser to walk the OIDC redirects by hand. */
export class Browser {
  readonly cookies = new Map<string, string>();
  readonly trail: string[] = [];

  constructor(
    private readonly publicBase: string,
    private readonly local: string,
  ) {}

  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async send(url: string, init: RequestInit = {}): Promise<Response> {
    const target = url.startsWith(this.publicBase) ? this.local + url.slice(this.publicBase.length) : url;
    const headers = { ...(init.headers as Record<string, string>), cookie: this.header() };
    const res = await fetch(target, { ...init, headers, redirect: "manual" });
    for (const line of res.headers.getSetCookie()) {
      const [pair = ""] = line.split(";");
      const at = pair.indexOf("=");
      const name = pair.slice(0, at);
      if (/max-age=0/i.test(line) || pair.slice(at + 1) === "") this.cookies.delete(name);
      else this.cookies.set(name, pair.slice(at + 1));
    }
    return res;
  }

  /** Follow redirects to the end (at most 12 hops). Records each URL in `trail`. */
  async follow(first: Response, from: string): Promise<Response> {
    let res = first;
    let at = from;
    for (let hop = 0; hop < 12 && res.status >= 300 && res.status < 400; hop++) {
      at = new URL(res.headers.get("location") ?? "", at).toString();
      this.trail.push(at);
      res = await this.send(at);
    }
    return res;
  }

  /** Press Continue with Google and finish the login at the OIDC server. Returns the last response. */
  async continueWithGoogle(): Promise<Response> {
    const url = `${this.publicBase}/sign-in/google`;
    const start = await this.send(url, { method: "POST", headers: { origin: this.publicBase } });
    return this.follow(start, url);
  }
}
