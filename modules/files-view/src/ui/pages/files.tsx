import { Eyebrow, Heading } from "@anvesx/design-system";
import { href } from "../format.js";
import { Filters } from "../parts/filters.js";
import { Empty } from "../parts/states.js";
import { FileTable } from "../parts/table.js";
import { Shell } from "../shell.js";
import type { FilesPage, Viewer } from "../types.js";

/** GET /files: search, filter, sort and browse every file the viewer may see. */
export const FilesScreen = ({ page, viewer }: { page: FilesPage; viewer?: Viewer | undefined }) => {
  const filtered = Object.entries(page.query).some(([k, v]) => v && !["sort", "dir", "cursor", "limit"].includes(k));
  return (
    <Shell title="Files" active="files" viewer={viewer} syncedAt={page.syncedAt}>
      <Eyebrow>Files</Eyebrow>
      <Heading>Files your connectors fetched</Heading>
      <p class="hint">Every file you may see, grouped by place, people or topic. Each group says why it exists.</p>
      <Filters page={page} />
      {page.rows.length ? <FileTable page={page} /> : <Empty filtered={filtered} clearHref={href("/files", {})} />}
    </Shell>
  );
};
