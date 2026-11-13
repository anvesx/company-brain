import { Eyebrow, Heading } from "@anvesx/design-system";
import { formatDate, formatSize } from "../format.js";
import { Paths } from "../parts/paths.js";
import { Removed } from "../parts/states.js";
import { Shell } from "../shell.js";
import type { FileDetail, Viewer } from "../types.js";

/** GET /files/:id: metadata, every group it belongs to and why. `readers` only when the route supplies it. */
export const FileScreen = ({ detail, viewer }: { detail: FileDetail; viewer?: Viewer | undefined }) => {
  const f = detail.file;
  if (detail.removed)
    return (
      <Shell title="Access removed" active="files" viewer={viewer}>
        <Removed />
      </Shell>
    );
  return (
    <Shell title={f.title} active="files" viewer={viewer}>
      <Eyebrow>File</Eyebrow>
      <Heading>{f.title}</Heading>
      <dl class="facts">
        <dt>Source</dt>
        <dd>{f.source}</dd>
        <dt>Owner</dt>
        <dd>{f.owner}</dd>
        <dt>Modified</dt>
        <dd>
          <time datetime={f.modified}>{formatDate(f.modified)}</time>
        </dd>
        <dt>Size</dt>
        <dd>{formatSize(f.size)}</dd>
        <dt>Type</dt>
        <dd>{f.mime}</dd>
        {f.folder && (
          <>
            <dt>Folder</dt>
            <dd>{f.folder}</dd>
          </>
        )}
        {detail.readers && (
          <>
            <dt>Readers</dt>
            <dd>{detail.readers.length ? detail.readers.join(", ") : "Only the owner"}</dd>
          </>
        )}
      </dl>
      <Heading level={2}>Groups and why</Heading>
      <Paths paths={f.clusters} />
      <p>
        <a href="/files">Back to files</a>
      </p>
    </Shell>
  );
};
