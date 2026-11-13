import { Button, FormField, Heading, Table, TableHeader, TableRow } from "@anvesx/design-system";
import { count, when } from "../model/format.js";
import type { Row } from "../model/rows.js";
import { Status } from "../shell/status.js";

/** Pieces the pages share or split out to stay small: the connected table, the health strip, the repository forms. */
export const Connected = ({ rows, now }: { rows: Row[]; now: number }) => (
  <Table>
    <thead>
      <TableRow>
        {["Provider", "Account", "Status", "Last sync", "Items", "Failures"].map((h) => (
          <TableHeader>{h}</TableHeader>
        ))}
      </TableRow>
    </thead>
    <tbody>
      {rows.map((r) => (
        <tr>
          <td data-label="Provider">{r.provider}</td>
          <td data-label="Account">
            <a href={`/accounts/${encodeURIComponent(r.account.id)}`}>{r.account.label}</a>
          </td>
          <td data-label="Status">
            <Status state={r.state} />
            {r.state.reason && <span class="why">{r.state.reason}</span>}
          </td>
          <td data-label="Last sync">{r.account.lastSyncAt === null ? "Never" : when(r.account.lastSyncAt, now)}</td>
          <td class="num" data-label="Items">
            {r.items === null ? "n/a" : count(r.items)}
          </td>
          <td class="num" data-label="Failures">
            {count(r.health.failures)}
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
);

export const Strip = ({ row, now }: { row: Row; now: number }) => (
  <dl class="strip">
    <div>
      <dt>Last run</dt>
      <dd>{when(row.account.lastSyncAt, now)}</dd>
    </div>
    <div>
      <dt>Failures in a row</dt>
      <dd class="big">{count(row.health.failures)}</dd>
    </div>
    <div>
      <dt>Items</dt>
      <dd class="big">{row.items === null ? "n/a" : count(row.items)}</dd>
    </div>
  </dl>
);

export const RepoForm = ({ base, repo }: { base: string; repo: string | null }) => (
  <>
    <form method="post" action={`${base}/repo`}>
      <Heading level={2}>Repository</Heading>
      <FormField label="Repository (owner/name)" name="repo" value={repo ?? ""} required />
      <Button secondary type="submit">
        Save repository
      </Button>
    </form>
    {repo && (
      <form method="post" action={`${base}/repo`} class="clear">
        <input type="hidden" name="repo" value="" />
        <Button secondary type="submit">
          Clear repository
        </Button>
      </form>
    )}
  </>
);
