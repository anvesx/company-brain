import type { ClusterPath } from "../types.js";

/** Root > leaf breadcrumb of links, the cluster type as text, and the one-line reason it exists. */
export const PathChip = ({ path }: { path: ClusterPath }) => (
  <li>
    <span class="crumb">
      <span class="type">{path.type}</span>
      {path.segments.map((s, i) => (
        <>
          {i > 0 && (
            <span class="sep" aria-hidden="true">
              &rsaquo;
            </span>
          )}
          <a href={`/clusters/${encodeURIComponent(s.id)}`}>{s.name}</a>
        </>
      ))}
    </span>
    <span class="why">Why: {path.why}</span>
  </li>
);

export const Paths = ({ paths }: { paths: ClusterPath[] }) =>
  paths.length ? (
    <ul class="paths">
      {paths.map((p) => (
        <PathChip path={p} />
      ))}
    </ul>
  ) : (
    <span class="hint">Not grouped yet</span>
  );
