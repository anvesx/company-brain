import type { AsyncGraphStore, GraphNode } from "@anvesx/graph-store";
import type { createIdentity } from "@anvesx/identity";
import type { Hono } from "hono";
import { canRead, readableDocuments } from "../gate/access.js";
import type { Aliases } from "../gate/accounts.js";
import { type Recheck, stillReadable } from "../live/recheck.js";

/** A pointer: where the text lives, never the text. */
const pointer = (n: GraphNode) => ({ id: n.id, source: n.source, address: n.address, title: n.title, version: n.version });
const readOnly = () => Response.json({ error: "read only" }, { status: 405 });
const notFound = () => Response.json({ error: "not found" }, { status: 404 });

/** `/v1/documents` and `/v1/documents/:id`: read-only, behind identity, pointers only. */
export function mountDocuments(
  app: Hono,
  deps: { store: AsyncGraphStore; protect: ReturnType<typeof createIdentity>["protect"]; aliases: Aliases; recheck?: Recheck },
): void {
  const { store, recheck } = deps;
  // identity.protect turns a missing or bad credential into its own 401 with the challenge header.
  const guarded = deps.protect;

  app.all("/v1/documents", (c) =>
    guarded(async (req, caller) => {
      if (req.method !== "GET") return readOnly();
      const docs = await stillReadable(await readableDocuments(store, caller.tenant, caller.user, await deps.aliases(caller.user)), caller, recheck);
      return Response.json({ documents: docs.map(pointer) });
    })(c.req.raw),
  );

  app.all("/v1/documents/:id", (c) =>
    guarded(async (req, caller) => {
      if (req.method !== "GET") return readOnly();
      const node = await store.node(caller.tenant, c.req.param("id"));
      // Same 404 whether the document is missing, not a document, or not the caller's to read.
      const visible = node?.kind === "document" && (await canRead(store, caller.tenant, caller.user, node.id, await deps.aliases(caller.user)));
      const live = visible ? await stillReadable([node], caller, recheck) : [];
      return live[0] ? Response.json(pointer(live[0])) : notFound();
    })(c.req.raw),
  );
}
