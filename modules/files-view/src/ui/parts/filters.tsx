import { Button, Link } from "@anvesx/design-system";
import { href } from "../format.js";
import type { FilesPage } from "../types.js";

const Select = ({
  name,
  label,
  value,
  options,
  any = true,
}: {
  name: string;
  label: string;
  value?: string | undefined;
  options: string[];
  any?: boolean | undefined;
}) => (
  <div class="field">
    <label for={name}>{label}</label>
    <select id={name} name={name}>
      {any && <option value="">Any</option>}
      {options.map((o) => (
        <option value={o} selected={o === value}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

const Text = ({ name, label, value, type = "text" }: { name: string; label: string; value?: string | undefined; type?: string | undefined }) => (
  <div class="field">
    <label for={name}>{label}</label>
    <input id={name} name={name} type={type} value={value} />
  </div>
);

/** GET form, no JavaScript. Hidden inputs keep cluster and sort when filters change. */
export const Filters = ({ page, action = "/files" }: { page: FilesPage; action?: string | undefined }) => {
  const q = page.query;
  const active = Object.entries(q).some(([k, v]) => v && !["cursor", "sort", "dir", "limit"].includes(k));
  return (
    <details class="fbox" open={active}>
      <summary>{active ? "Filters (active)" : "Filters"}</summary>
      <form class="filters" method="get" action={action} aria-label="Search and filter files">
        <div class="field q">
          <label for="q">Search file titles</label>
          <input id="q" name="q" type="search" value={q.q} maxlength={200} autocomplete="off" />
        </div>
        <Select name="source" label="Source" value={q.source} options={page.sources} />
        <Select name="mime" label="Type" value={q.mime} options={page.mimes} />
        <Text name="owner" label="Owner" value={q.owner} />
        <Text name="from" label="Modified from" value={q.from} type="date" />
        <Text name="to" label="Modified to" value={q.to} type="date" />
        <Select name="sort" label="Sort by" value={q.sort} options={["modified", "title", "size"]} any={false} />
        {q.cluster && <input type="hidden" name="cluster" value={q.cluster} />}
        <div>
          <Button type="submit">Apply</Button> {active && <Link href={href(action, {}, { sort: q.sort, cluster: q.cluster })}>Clear</Link>}
        </div>
      </form>
    </details>
  );
};
