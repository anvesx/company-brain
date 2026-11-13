import { JSDOM } from "jsdom";
import type { FileRow } from "../../../src/ui/index.js";

export const dom = (html: string): Document => new JSDOM(html).window.document;
export const file = (over: Partial<FileRow> = {}): FileRow => ({
  id: "f/1",
  title: "Quarterly plan <b>",
  source: "notion",
  owner: "alice",
  mime: "text/plain",
  size: 2048,
  modified: "2026-10-01T10:00:00Z",
  folder: "/finance",
  clusters: [
    {
      type: "place",
      why: "Same folder /finance",
      segments: [
        { id: "r", name: "Finance" },
        { id: "l", name: "Q3" },
      ],
    },
  ],
  ...over,
});
/** The link with exactly this href (CSS attribute selectors choke on `?` and `&` in jsdom). */
export const link = (d: Document, href: string): Element | undefined => [...d.querySelectorAll("a")].find((a) => a.getAttribute("href") === href);
