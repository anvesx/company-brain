import type { AsyncGraphStore, GraphNode } from "@anvesx/graph-store";
import type { createIdentity } from "@anvesx/identity";
import { openGate, type Recheck } from "@anvesx/visibility/gate";
import type { Hono } from "hono";
import type { Aliases } from "../gate/accounts.js";

/** A pointer: where the text lives, never the text. */
const pointer = (n: GraphNode) => ({ id: n.id, source: n.source, address: n.address, title: n.title, version: n.version });
const readOnly = () => Response.json({ error: "read only" }, { status: 405 });
const notFound = () => Response.json({ error: "not found" }, { status: 404 });

/** `/v1/documents` and `/v1/documents/:id`: read-only, behind identity, pointers only, every answer from the shared gate. */
export function mountDocuments(
  app: Hono,
  deps: { store: AsyncGraphStore; protect: ReturnType<typeof createIdentity>["protect"]; aliases: Aliases; recheck?: Recheck },
): void {
  // identity.protect turns a missing or bad credential into its own 401 with the challenge header.
  const gate = async (caller: { tenant: string; user: string }) =>
    openGate(deps.store, { ...caller, aliases: await deps.aliases(caller.user) }, { recheck: deps.recheck });

  app.all("/v1/documents", (c) =>
    deps.protect(async (req, caller) => {
      if (req.method !== "GET") return readOnly();
      const approved = [...(await (await gate(caller)).approve()).values()].map((a) => a.doc);
      return Response.json({ documents: approved.sort((a, b) => a.id.localeCompare(b.id)).map(pointer) });
    })(c.req.raw),
  );

  app.all("/v1/documents/:id", (c) =>
    deps.protect(async (req, caller) => {
      if (req.method !== "GET") return readOnly();
      // Same 404 whether the document is missing, not a document, or not the caller's to read.
      const hit = (await (await gate(caller)).approve([c.req.param("id")])).values().next().value;
      return hit ? Response.json(pointer(hit.doc)) : notFound();
    })(c.req.raw),
  );
}
