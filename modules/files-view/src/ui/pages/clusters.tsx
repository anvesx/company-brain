import { Eyebrow, Heading, Paragraph } from "@anvesx/design-system";
import { Shell } from "../shell.js";
import type { ClusterNode, Viewer } from "../types.js";

const Row = ({ n }: { n: ClusterNode }) => (
  <>
    <span class="type">{n.type}</span>
    <a href={`/clusters/${encodeURIComponent(n.id)}`}>{n.name}</a>
    <span class="count">{n.count} files</span>
    <span class="why">Why: {n.why}</span>
  </>
);

/** Groups with sub-groups fold and unfold (native details, no JavaScript); open by default so nothing is hidden at first sight. */
export const Tree = ({ nodes }: { nodes: ClusterNode[] }) => (
  <ul class="tree">
    {nodes.map((n) => (
      <li>
        <Row n={n} />
        {n.children.length > 0 && (
          <details open>
            <summary>{n.children.length} sub-groups</summary>
            <Tree nodes={n.children} />
          </details>
        )}
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
