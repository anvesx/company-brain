import { Button, Eyebrow, FormField, Heading, Link, Paragraph } from "@anvesx/design-system";
import { count, when } from "../model/format.js";
import type { Row } from "../model/rows.js";
import { Shell } from "../shell/layout.js";
import { type Note, Status } from "../shell/status.js";

type Props = { email: string; row: Row; now: number; needsRepo: boolean; note?: Note | undefined };

const Strip = ({ row, now }: { row: Row; now: number }) => (
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

/** One account: its state, its health, and the three things you can do to it. */
export const AccountPage = ({ email, row, now, needsRepo, note }: Props) => {
  const { account: a, state } = row;
  const base = `/accounts/${encodeURIComponent(a.id)}`;
  return (
    <Shell title={a.label} email={email} note={note}>
      <Eyebrow>{row.provider}</Eyebrow>
      <Heading>{a.label}</Heading>
      <Status state={state} />
      {state.reason && <Paragraph>{state.reason}</Paragraph>}
      <Strip row={row} now={now} />
      <div class="acts">
        <form method="post" action={`${base}/sync`}>
          <Button type="submit">Sync now</Button>
        </form>
        <details class="confirm">
          <summary>Disconnect</summary>
          <p>This removes the saved sign-in and stops reading {row.provider}.</p>
          <form method="post" action={`${base}/disconnect`}>
            <Button danger type="submit">
              Disconnect {a.label}
            </Button>
          </form>
        </details>
      </div>
      {needsRepo && (
        <form method="post" action={`${base}/repo`}>
          <Heading level={2}>Repository</Heading>
          <FormField label="Repository (owner/name)" name="repo" value={a.repo ?? ""} required />
          <Button secondary type="submit">
            Save repository
          </Button>
        </form>
      )}
      <Paragraph>
        <Link href="/">Back to connections</Link>
      </Paragraph>
    </Shell>
  );
};
