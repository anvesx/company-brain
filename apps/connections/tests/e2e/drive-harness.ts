import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGraphStore } from "@brain/graph-store";
import { type DFile, DOC, startDrive } from "../../../../services/connectors/tests/support/drive-server.js";
import { oauthProvider } from "../../src/oauth/providers.js";
import { boot, root } from "../http/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";

export const files: DFile[] = [
  {
    id: "doc1",
    name: "Leave policy",
    mimeType: DOC,
    version: "42",
    body: "Leave",
    permissions: [
      { type: "user", emailAddress: "alice@acme.test" },
      { type: "domain", domain: "acme.test" },
    ],
  },
  { id: "txt1", name: "notes.txt", mimeType: "text/plain", version: "7", body: "notes", permissions: [{ type: "user", emailAddress: "bob@acme.test" }] },
  { id: "txt2", name: "faq.txt", mimeType: "text/plain", version: "2", body: "faq", permissions: [{ type: "anyone" }] },
];

/** The real app, the real Drive adapter and googleapis client, a local Google OAuth provider and a local Drive v3 server. */
export async function bootDrive(opts: Parameters<typeof startDrive>[1] = {}) {
  const idp = await startReplay({ id: "cid", secret: "csecret" });
  const drive = await startDrive(files, opts);
  const dir = mkdtempSync(join(tmpdir(), "conn-drive-"));
  const graphPath = join(dir, "graph.db");
  const graph = createGraphStore({ path: graphPath });
  const google = oauthProvider("google", {
    clientId: "cid",
    clientSecret: "csecret",
    redirectURI: "http://app.test/v1/oauth/google/callback",
    authorizeURL: `${idp.url}/authorize`,
    tokenURL: `${idp.url}/token`,
  });
  const s = await boot({ oauth: { google }, sync: { graph, driveRootUrl: drive.url } });
  const connect = async (query: string) => {
    const start = await s.call("GET", `/v1/oauth/google/start${query}`, root);
    const consent = await fetch(start.headers.get("location") ?? "", { redirect: "manual" });
    const back = new URL(consent.headers.get("location") ?? "");
    const made = await s.call("GET", back.pathname + back.search);
    return { made, code: back.searchParams.get("code") };
  };
  const close = async () => {
    await s.close();
    graph.close();
    idp.close();
    await drive.close();
    rmSync(dir, { recursive: true, force: true });
  };
  return { s, drive, graphPath, connect, close };
}
