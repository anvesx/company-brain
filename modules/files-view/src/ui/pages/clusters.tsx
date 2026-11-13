import { Eyebrow, Heading, Paragraph } from "@anvesx/design-system";
import { Shell } from "../shell.js";
import type { ClusterNode, Viewer } from "../types.js";

export const Tree = ({ nodes }: { nodes: ClusterNode[] }) => (
  <ul class="tree">
    {nodes.map((n) => (
      <li>
        <span class="type">{n.type}</span>
        <a href={`/clusters/${encodeURIComponent(n.id)}`}>{n.name}</a>
        <span class="count">
          {n.count}
          <span class="sr"> files</span>
        </span>
        <span class="why">Why: {n.why}</span>
        {n.children.length > 0 && <Tree nodes={n.children} />}
      </li>
    ))}
  </ul>
);

/** GET /clusters: the group tree with approved counts and each group's reason. */
export const ClustersScreen = ({ roots, viewer, syncedAt }: { roots: ClusterNode[]; viewer?: Viewer | undefined; syncedAt?: string | undefined }) => (
  <Shell title="Groups" active="clusters" viewer={viewer} syncedAt={syncedAt}>
    <Eyebrow>Groups</Eyebrow>
    <Heading>How your files were grouped</Heading>
    {roots.length ? <Tree nodes={roots} /> : <Paragraph>No groups yet. Groups appear after connectors fetch files and clustering runs.</Paragraph>}
  </Shell>
);
