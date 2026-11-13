import { esc } from "../layout.js";

const SVG = (inner: string): string => `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">${inner}</svg>`;

/** Plain marks, drawn here, one per catalog id. Anything else gets its first letter, so a new connector needs no art to ship. */
const MARKS: Record<string, string> = {
  github: SVG('<circle cx="12" cy="12" r="10" fill="#8b949e"/><path d="M8 17v-3.5M16 17v-3.5M7 8l2 2h6l2-2v5a5 5 0 0 1-10 0z" fill="#0d1117"/>'),
  "google-drive": SVG('<path d="M8 3h8l6 10h-8z" fill="#fbbc04"/><path d="M8 3 2 13l4 7 6-10z" fill="#0f9d58"/><path d="M6 20h12l4-7H10z" fill="#4285f4"/>'),
  slack: SVG(
    '<rect x="3" y="9" width="8" height="3" rx="1.5" fill="#36c5f0"/><rect x="13" y="12" width="8" height="3" rx="1.5" fill="#ecb22e"/><rect x="9" y="3" width="3" height="8" rx="1.5" fill="#2eb67d"/><rect x="12" y="13" width="3" height="8" rx="1.5" fill="#e01e5a"/>',
  ),
};

/** The logo for a tile. The id is only ever a lookup key; the fallback letter is escaped. */
export const logo = (id: string, name: string): string =>
  MARKS[id] ?? SVG(`<text x="12" y="17" text-anchor="middle" font-size="14" fill="currentColor">${esc(name.slice(0, 1).toUpperCase())}</text>`);
