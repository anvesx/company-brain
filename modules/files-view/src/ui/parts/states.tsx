import { Eyebrow, Flash, Heading, Link, Paragraph } from "@anvesx/design-system";
import { Shell } from "../shell.js";

/** Nothing to show. `filtered` distinguishes "no results" from "no files fetched yet". */
export const Empty = ({ filtered, clearHref }: { filtered: boolean; clearHref: string }) => (
  <section class="empty" aria-labelledby="empty-h">
    <h2 id="empty-h">{filtered ? "No files match these filters" : "No files yet"}</h2>
    <Paragraph>
      {filtered
        ? "Nothing you can access matches. Try fewer filters or a shorter search."
        : "Connectors have not fetched any files you can access. Files appear here after a connector syncs; only metadata is stored, never contents."}
    </Paragraph>
    {filtered ? <Link href={clearHref}>Clear all filters</Link> : <Link href="/clusters">Browse groups</Link>}
  </section>
);

/** Request failed. 4xx text is safe to show; 5xx shows a generic message and the request id. */
export const ErrorView = ({ status, message, requestId }: { status: number; message?: string | undefined; requestId?: string | undefined }) => (
  <section aria-labelledby="err-h">
    <Eyebrow>Error {status}</Eyebrow>
    <Heading>
      <span id="err-h">{status === 401 ? "Sign in required" : status === 404 ? "Not found" : status < 500 ? "Request not valid" : "Something went wrong"}</span>
    </Heading>
    <Flash bad>
      {status < 500 || status === 401 ? (message ?? "Please check the request and try again.") : "We could not load this page. Try again shortly."}
    </Flash>
    {requestId && <p class="hint">Request id {requestId}</p>}
    <Link href="/files">Back to files</Link>
  </section>
);

/** The source no longer allows this viewer access. No metadata is shown. */
export const Removed = () => (
  <section class="removed" role="status" aria-labelledby="rm-h">
    <h1 id="rm-h">Access removed</h1>
    <Paragraph>
      This item was removed, or you no longer have access. The source no longer allows you to open this file, so its details are hidden. If you think this is a
      mistake, ask the file owner or an admin.
    </Paragraph>
    <Link href="/files">Back to files</Link>
  </section>
);

/** Full-page error inside the shell, for the route layer's onError and 401/404 handlers. */
export const ErrorScreen = (p: { status: number; message?: string | undefined; requestId?: string | undefined }) => (
  <Shell title="Error" active="files">
    <ErrorView {...p} />
  </Shell>
);
