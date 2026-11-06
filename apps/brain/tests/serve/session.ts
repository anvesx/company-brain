import { createPostgresGraphStore } from "@anvesx/graph-store";
import { createIdentity } from "@anvesx/identity";
import { PostgresDialect } from "kysely";
import pg from "pg";
import { env } from "./boot.js";

export type Who = { tenant: string; user: string };

type Cfg = Pick<ReturnType<typeof env>, "BASE_URL" | "IDENTITY_SECRET">;

/** Who identity says owns `cookie`. `serve` keeps its identity private, so a second identity on the same database and secret resolves it. */
export async function whoIs(dbUrl: string, cookie: string, e: Cfg): Promise<Who> {
  const pool = new pg.Pool({ connectionString: dbUrl });
  try {
    const identity = createIdentity({
      baseUrl: e.BASE_URL,
      secret: e.IDENTITY_SECRET,
      resource: `${e.BASE_URL}/mcp`,
      database: { dialect: new PostgresDialect({ pool }), type: "postgres" as const },
    });
    await identity.auth.$context;
    const caller = await identity.port.fromSession(new Headers({ cookie }));
    if (!caller) throw new Error("the cookie has no live session");
    return { tenant: caller.tenant, user: caller.user };
  } finally {
    await pool.end();
  }
}

/**
 * Signs a person up on a running `serve` and returns their session cookie and who identity says they are.
 * `e` defaults to the test env; the image test passes the BASE_URL and IDENTITY_SECRET its container runs with.
 */
export async function signUp(base: string, dbUrl: string, e: Cfg = env(dbUrl)): Promise<{ cookie: string; who: Who }> {
  const res = await fetch(`${base}/api/auth/sign-up/email`, {
    method: "POST",
    body: JSON.stringify({ email: `p${Date.now()}${Math.random().toString(16).slice(2)}@brain.test`, password: `${e.IDENTITY_SECRET}Aa1`, name: "P" }),
    headers: { "content-type": "application/json", origin: e.BASE_URL },
  });
  if (res.status !== 200) throw new Error(`sign-up answered ${res.status}`);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { cookie, who: await whoIs(dbUrl, cookie, e) };
}

/** Gives `who` one readable document "d1", the way sync would write it. */
export async function seed(dbUrl: string, who: Who): Promise<void> {
  const pool = new pg.Pool({ connectionString: dbUrl });
  const store = await createPostgresGraphStore({ pool });
  const node = (id: string, kind: "person" | "document") => ({
    tenant: who.tenant,
    id,
    kind,
    source: "drive",
    address: id,
    title: id,
    version: "1",
    props: {},
  });
  await store.upsertNode(node(who.user, "person"), 1);
  await store.upsertNode({ ...node("d1", "document"), title: "Plan" }, 1);
  await store.addEdge({ tenant: who.tenant, from: who.user, to: "d1", kind: "can-read", source: "drive" }, 1);
  await store.close();
  await pool.end();
}
