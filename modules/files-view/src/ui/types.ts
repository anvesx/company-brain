/** View models the route layer fills after the permission gate. Metadata only, never file content. */
export type ClusterType = "place" | "people" | "topic";

export interface ClusterRef {
  id: string;
  name: string;
}

/** One root-to-leaf path. `why` is the leaf cluster's one-sentence metadata reason. */
export interface ClusterPath {
  segments: ClusterRef[];
  type: ClusterType;
  why: string;
}

export interface FileRow {
  id: string;
  title: string;
  source: string;
  owner: string;
  mime: string;
  size: number;
  modified: string;
  folder?: string | undefined;
  clusters: ClusterPath[];
}

export interface FilesQuery {
  q?: string | undefined;
  source?: string | undefined;
  mime?: string | undefined;
  owner?: string | undefined;
  cluster?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  sort?: "modified" | "title" | "size" | undefined;
  dir?: "asc" | "desc" | undefined;
  cursor?: string | undefined;
  limit?: string | undefined;
}

export interface FilesPage {
  rows: FileRow[];
  nextCursor?: string | undefined;
  total?: number | undefined;
  query: FilesQuery;
  /** Option lists for the filter selects, already gate-filtered. */
  sources: string[];
  mimes: string[];
  /** ISO time of the last connector sync that touched this tenant. */
  syncedAt?: string | undefined;
}

export interface FileDetail {
  file: FileRow;
  /** Present only for the owner or an admin. */
  readers?: string[] | undefined;
  /** Recheck says the source no longer allows access. */
  removed?: boolean | undefined;
}

export interface ClusterNode {
  id: string;
  name: string;
  type: ClusterType;
  why: string;
  count: number;
  children: ClusterNode[];
}

export interface ClusterDetail {
  node: ClusterNode;
  ancestors: ClusterRef[];
  members: FilesPage;
}

export interface Viewer {
  name: string;
  admin?: boolean | undefined;
}
