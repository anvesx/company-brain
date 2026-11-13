import { Eyebrow, Heading } from "@anvesx/design-system";
import { Filters } from "../parts/filters.js";
import { Empty } from "../parts/states.js";
import { FileTable } from "../parts/table.js";
import { Shell } from "../shell.js";
import type { ClusterDetail, Viewer } from "../types.js";
import { Tree } from "./clusters.js";

/** GET /clusters/:id: breadcrumb, reason, sub-groups and the approved member files. */
export const ClusterScreen = ({ detail, viewer }: { detail: ClusterDetail; viewer?: Viewer | undefined }) => {
  const { node, ancestors, members } = detail;
  const base = `/clusters/${encodeURIComponent(node.id)}`;
  return (
    <Shell title={node.name} active="clusters" viewer={viewer} syncedAt={members.syncedAt}>
      <Eyebrow>
        {node.type} group · <a href="/clusters">All groups</a>
        {ancestors.map((a) => (
          <>
            {" "}
            &rsaquo; <a href={`/clusters/${encodeURIComponent(a.id)}`}>{a.name}</a>
          </>
        ))}
      </Eyebrow>
      <Heading>{node.name}</Heading>
      <p>
        <strong>Why this group exists:</strong> {node.why}
      </p>
      <p class="hint">{node.count} files you can access</p>
      {node.children.length > 0 && (
        <>
          <Heading level={2}>Sub-groups</Heading>
          <Tree nodes={node.children} />
        </>
      )}
      <Heading level={2}>Files</Heading>
      <Filters page={members} action={base} />
      {members.rows.length ? (
        <FileTable page={members} base={base} />
      ) : (
        <Empty filtered={Object.entries(members.query).some(([k, v]) => v && !["sort", "dir", "cursor", "limit", "cluster"].includes(k))} clearHref={base} />
      )}
    </Shell>
  );
};
