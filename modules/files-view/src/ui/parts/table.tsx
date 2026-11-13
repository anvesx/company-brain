import { Link } from "@anvesx/design-system";
import { formatDate, formatSize, href } from "../format.js";
import type { FileRow, FilesPage } from "../types.js";
import { Paths } from "./paths.js";

const Th = ({ page, base, k, label, num }: { page: FilesPage; base: string; k: "modified" | "title" | "size"; label: string; num?: boolean | undefined }) => {
  const on = (page.query.sort ?? "modified") === k;
  const dir = page.query.dir ?? (k === "title" ? "asc" : "desc");
  const next = on && dir === "desc" ? "asc" : "desc";
  return (
    <th scope="col" class={num ? "num" : undefined} aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : undefined}>
      <a href={href(base, page.query, { sort: k, dir: next })}>{label}</a>
    </th>
  );
};

const Row = ({ f }: { f: FileRow }) => (
  <tr>
    <td class="title" data-label="Title">
      <a href={`/files/${encodeURIComponent(f.id)}`}>{f.title.trim() === "" ? f.id : f.title}</a>
      {f.folder && <span class="sub">{f.folder}</span>}
    </td>
    <td data-label="Source">{f.source}</td>
    <td data-label="Owner">{f.owner}</td>
    <td data-label="Modified">
      <time datetime={f.modified}>{formatDate(f.modified)}</time>
    </td>
    <td class="num" data-label="Size">
      {formatSize(f.size)}
    </td>
    <td data-label="Groups">
      <Paths paths={f.clusters} />
    </td>
  </tr>
);

/** One row per gate-approved file. Sortable headers are links; the pager keeps the active query. */
export const FileTable = ({ page, base = "/files" }: { page: FilesPage; base?: string | undefined }) => (
  <>
    <table class="table files">
      <caption class="sr">
        Files, {page.rows.length} on this page{page.total === undefined ? "" : ` of ${page.total}`}
      </caption>
      <thead>
        <tr>
          <Th page={page} base={base} k="title" label="Title" />
          <th scope="col">Source</th>
          <th scope="col">Owner</th>
          <Th page={page} base={base} k="modified" label="Modified" />
          <Th page={page} base={base} k="size" label="Size" num />
          <th scope="col">Groups and why</th>
        </tr>
      </thead>
      <tbody>
        {page.rows.map((f) => (
          <Row f={f} />
        ))}
      </tbody>
    </table>
    <nav class="pager" aria-label="Pagination">
      <span class="hint">
        {page.rows.length} shown{page.total === undefined ? "" : ` of ${page.total}`}
      </span>
      {page.nextCursor ? <Link href={href(base, page.query, { cursor: page.nextCursor })}>Next page</Link> : <span class="hint">End of results</span>}
    </nav>
  </>
);
