import type { createIdentity } from "@anvesx/identity";
import { RefreshError } from "@anvesx/identity";
import type { Hono } from "hono";
import { baseUrl } from "../doors/base.js";
import { SOURCES } from "./sources.js";
import { dataPage } from "./view.js";

type Identity = ReturnType<typeof createIdentity>;
const page = (html: string, status = 200): Response => new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });

/** `GET /connections/data/:provider`: the person's own linked account, read with its stored token. */
export const mountLinked = (app: Hono, deps: { identity: Identity; env: Record<string, string | undefined> }): void => {
  const { identity, env } = deps;
  app.get("/connections/data/:provider", async (c) => {
    const id = c.req.param("provider");
    const source = Object.hasOwn(SOURCES, id) ? SOURCES[id] : undefined;
    const caller = await identity.port.fromSession(c.req.raw.headers).catch(() => null);
    if (!caller) return Response.redirect(new URL("/sign-in", c.req.url), 302);
    const rows = await (await identity.adapter()).findMany<{ id: string }>({
      model: "account",
      where: [
        { field: "userId", value: caller.user },
        { field: "providerId", value: id },
      ],
      limit: 1,
    });
    if (!source || !rows[0]) return page(dataPage("Not found", "", { error: "That connector is not linked." }), 404);
    const name = id;
    try {
      const token = await identity.port.accessToken(caller.user, id, rows[0].id);
      const res = await fetch(new URL(source.path, baseUrl(id, env) ?? source.origin), {
        headers: { authorization: `Bearer ${token}`, accept: "application/json", "user-agent": "company-brain" },
      });
      const json: unknown = await res.json().catch(() => null);
      const failed = !res.ok || (json as { ok?: boolean } | null)?.ok === false;
      return failed
        ? page(dataPage(name, source.title, { error: "The provider refused the request." }), 502)
        : page(dataPage(name, source.title, { rows: source.rows(json) }));
    } catch (error) {
      const again = error instanceof RefreshError && error.code === "NEEDS_AUTH";
      return page(dataPage(name, source.title, { error: again ? "Sign in to this connector again." : "The provider did not answer." }), again ? 409 : 502);
    }
  });
};
