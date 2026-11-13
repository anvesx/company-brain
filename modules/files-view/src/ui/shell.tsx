import { createHash } from "node:crypto";
import { Main, SkipLink, styles } from "@anvesx/design-system";
import type { Child } from "hono/jsx";
import { age, formatDate } from "./format.js";
import { filesCss } from "./styles/css.js";
import type { Viewer } from "./types.js";

const sha = (s: string) => `'sha256-${createHash("sha256").update(s).digest("base64")}'`;

/** CSP style-src sources for the design-system and module inline stylesheets. */
export const styleHashes = (): string[] => [sha(styles), sha(filesCss)];

const Nav = ({ active, viewer }: { active: "files" | "clusters"; viewer?: Viewer | undefined }) => (
  <nav class="top" aria-label="Primary">
    <a href="/files" aria-current={active === "files" ? "page" : undefined}>
      Files
    </a>
    <a href="/clusters" aria-current={active === "clusters" ? "page" : undefined}>
      Groups
    </a>
    {viewer && (
      <span class="who hint">
        {viewer.name}
        {viewer.admin ? " (admin)" : ""}
      </span>
    )}
  </nav>
);

/** Own document wrapper: the design-system Document links a Google Fonts stylesheet that this page's strict CSP blocks, so fonts stay on the system stack. */
const Page = ({ title, children }: { title: string; children?: Child | undefined }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <meta name="description" content="Files and groups your connectors fetched. Metadata only." />
      <style dangerouslySetInnerHTML={{ __html: filesCss }} />
      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </head>
    <body>{children}</body>
  </html>
);

/** Page frame. `syncedAt` renders the freshness line so customers know how current the list is. */
export const Shell = ({
  title,
  active,
  viewer,
  syncedAt,
  children,
}: {
  title: string;
  active: "files" | "clusters";
  viewer?: Viewer | undefined;
  syncedAt?: string | undefined;
  children?: Child | undefined;
}) => (
  <Page title={`${title} – Company Brain`}>
    <SkipLink />
    <Main wide>
      <Nav active={active} viewer={viewer} />
      {syncedAt && (
        <p class="hint fresh">
          Last synced{" "}
          <time datetime={syncedAt} title={formatDate(syncedAt)}>
            {age(syncedAt)}
          </time>
          . Only file metadata is stored, never contents.
        </p>
      )}
      {children}
    </Main>
  </Page>
);
