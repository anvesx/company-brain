import { Button, Document, Main, SkipLink } from "@anvesx/design-system";
import type { Child } from "hono/jsx";
import { type Note, Notice } from "./status.js";

/** Screens that have no route yet. They are text, never links. */
const SOON = ["Ask", "Graph"];

type Props = { title: string; email: string; note?: Note | undefined; children?: Child };

/** The one frame for every page: left rail, top bar with the signed-in email and Sign out, then the page. */
export const Shell = ({ title, email, note, children }: Props) => (
  <Document title={`${title} - Company Brain`} head={<link rel="stylesheet" href="/ui/app.css" />}>
    <SkipLink />
    <div class="app">
      <nav class="rail" aria-label="Sections">
        <p class="mark">Company Brain</p>
        <a href="/" aria-current="page">
          Connections
        </a>
        {SOON.map((name) => (
          <span aria-disabled="true">
            {name} <small>Soon</small>
          </span>
        ))}
      </nav>
      <div>
        <header class="top">
          <span>{email}</span>
          <form method="post" action="/sign-out">
            <Button secondary type="submit">
              Sign out
            </Button>
          </form>
        </header>
        <Main wide>
          <Notice note={note} />
          {children}
        </Main>
      </div>
    </div>
  </Document>
);
